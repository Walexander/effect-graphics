import { convexHull } from 'effect-canvas/algorithms'
import { Canvas } from 'effect-canvas/Canvas'
import { DomLive, domLive } from 'effect-canvas/services/Dom'
import type { Shape } from 'effect-canvas/Shapes'
import { Arc, Point } from 'effect-canvas/Shapes'
import { Angle } from 'effect-canvas/Units'

import { drawBoid } from './boids'
import { game } from './game'
import { gridLines } from './grid-lines'

const randomCanvasPoints = (count: number) =>
  Canvas.dimensions().flatMap(({ height, width }) =>
    Point.randomPoints(
      count,
      Point(5, 5),
      Point(width - 5, height - 5)
    )
  )

const drawHull2 = (points: HashSet<Point>) =>
  pipe(
    convexHull(points),
    ([first, ...rest]) =>
      (
        Canvas.setFillStyle('black')
          > labeledPoint(first!)
          > Effect.forEach(points, drawAngleFrom(first!))
      )
        > drawPath(rest)
            .as([first!, ...rest])
            .orDie / Canvas.withContext
  )
const drawAngleFrom = (from: Point) => {
  return (to: Point) =>
    (Canvas.beginPath()
      > Canvas.moveTo(from.x, from.y)
      > Canvas.lineTo(to.x, to.y)
      > Canvas.setStrokeStyle(`hsla(${2 * from.angleTo(to).degrees}, 50%, ${50}%, 0.15)`)
      > Canvas.stroke()
      > labeledPoint(to)
      > Canvas.setFillStyle(
        `hsl(${from.angleTo(to).degrees * 2}, 50%, ${50}%)`
      )
      > Canvas.fill())
    / Canvas.withContext
}

// Shrunk:
// [{"x":454,"y":24},{"x":872,"y":71},{"x":811,"y":29},{"x":454,"y":24}, {"x": 900, "y": 24}]

// [{"x":425,"y":28},{"x":66,"y":38},{"x":150,"y":93},{"x":150,"y":93},{"x":73,"y":146}]

const drawPath = (path: Point[]) =>
  (
    Canvas.setLineWidth(1)
      > Canvas.beginPath()
      > Canvas.setFillStyle('black')
      > Canvas.setStrokeStyle('black')
      > Effect.forEachWithIndex(path, (point) =>
        Canvas.lineTo(point.x, point.y)
          > Canvas.stroke().delay((10).millis)
          > (
              Canvas.beginPath()
                > Canvas.arc(point.x, point.y, 6, 0, Math.PI * 2, false)
                > Canvas.fill()
            ) / Canvas.withContext)
      > Canvas.lineTo(path[0]!.x, path[0]!.y)
      > Canvas.stroke()
  ) / Canvas.withContext

const labeledPoint = (point: Point) =>
  Canvas.beginPath()
    > Canvas.arc(point.x, point.y, 4, 0, Math.PI * 2, false)

const clearCanvas = Canvas.dimensions().flatMap(({ height, width }) =>
  Canvas.setFillStyle('hsla(0, 0%, 100%, 0.5)')
    > Canvas.fillRect(0, 0, width, height)
)

function updateTextArea(id: string, value: string) {
  const hull = document.getElementById(id)
  return hull instanceof HTMLTextAreaElement ?
    Effect.sync(() => {
      hull.value = value
    }) :
    Effect.logWarning(`cannot find text area ${id}`).zipRight(Effect.fail(`cannot find ${id}`))
}
const drawRandomPoints2 = (points: HashSet<Point>) =>
  gridLines >
    drawHull2(points).tap(_ => updateTextArea('points-json', JSON.stringify(_)).orDie)

const element = (id: string) =>
  Effect.sync(() => document.getElementById(id)).map(Maybe.fromNullable).flatMap(Effect.fromMaybe)

export function clickStream(el: string): Stream<never, Maybe<never>, MouseEvent> {
  return pipe(
    element(el),
    Stream.fromEffect,
    Stream.$.flatMap(element => addHandlerI(element)('click', (event) => event)),
    Stream.$.filter((_): _ is MouseEvent => _ instanceof MouseEvent),
    Stream.$.ensuring(Effect.log(`this stream is finalized!!`))
  )

  function addHandlerI(element: HTMLElement) {
    return (<A>(event: string, handler: (event: Event) => A) =>
      Stream.asyncInterrupt<never, never, A>(emit => {
        const handler$ = (event: Event) =>
          pipe(
            handler(event),
            Chunk.single,
            Effect.succeed,
            emit
          )
        element.addEventListener(event, handler$)
        return Either.left(Effect.sync(() => element.removeEventListener(event, handler$)))
      }))
  }
}

export const init2 = () => {
  const decoder = Derive<Decoder<Point[]>>()
  document.getElementById('json-points')?.addEventListener('click', async () => {
    const text = document.getElementById('points-json')
    const value = text instanceof (HTMLTextAreaElement) ? text.value : ''
    await Canvas.drawTo(
      'canvas2',
      Effect.fromEither(decoder.decodeJSON(value))
        .tapError(_ => Effect.logError(`Error decoding : ${_.message}`))
        .orDie
        .map(HashSet.from)
        .flatMap(points => drawRandomPoints2(points))
    )
  })
  const RefTag = Service.Tag<Ref<number>>()
  const refLayer = Layer.fromEffect(RefTag)(Ref.make(25))
  const getCount = Effect.service(RefTag).flatMap(_ => _.get)
  const setCount = (value: number) => Effect.service(RefTag).flatMap(_ => _.set(value))

  const PointsTag = Service.Tag<Ref<HashSet<Point>>>()
  const addPoints = (points: HashSet<Point>) =>
    Effect.service(PointsTag).flatMap(_ => _.update(existing => existing.union(points)))
  const clearPoints = Effect.service(PointsTag).flatMap(_ => _.set(HashSet.empty()))
  const getPoints = Effect.service(PointsTag).flatMap(_ => _.get)
  const pointLayer = Layer.fromEffect(PointsTag)(Ref.make(HashSet.empty()))

  const isInput: Refinement<HTMLElement, HTMLInputElement> = (el): el is HTMLInputElement =>
    el instanceof HTMLInputElement
  const setText = (id: string, text: string) => element(id).flatMap(_ => Effect.sync(() => _.innerText = text)).orDie

  const addHandler = (element: HTMLElement) =>
    <A>(event: string, handler: (event: Event) => A) =>
      Stream.asyncEffect<never, never, A, void>(emit =>
        Effect.sync(() => element.addEventListener(event, event => emit(Effect.succeed(Chunk.single(handler(event))))))
      )
  const addHandlerM = (element: HTMLElement) =>
    <R, E, A>(eventName: string, handler: (event: Event) => Effect<R, E, A>) =>
      Stream.asyncEffect<R, E, A, void>(emit =>
        Effect.sync(() =>
          element.addEventListener(
            eventName,
            event => emit(handler(event).mapError(Maybe.some).map(_ => Chunk.single(_)))
          )
        )
      )

  const valueStream = (el: string) =>
    pipe(
      element(el),
      Effect.$.flatMap((_) => Effect.fromMaybe(Maybe.fromPredicate(_, isInput))),
      Stream.fromEffect,
      Stream.$.flatMap(element => addHandlerM(element)('change', () => getValue(element)))
    )
  const _tickstream = clickStream('tick')
    .debounce((100).millis)
    .mapEffect(_ => getCount.flatMap(randomCanvasPoints).tap(addPoints).zipRight(getPoints))

  const _pointStream = clickStream('points').mapEffect(_ =>
    gridLines > randomCanvasPoints(25).flatMap(_ => drawHull2(_))
  )
  const getValue = (el: HTMLInputElement) => Effect.sync(() => el.value)

  const _boomstream = clickStream('boom')
    .mapEffect(_ => Effect.log(`"BOOM"`) > gridLines > clearPoints)

  const _countstream = pipe(
    valueStream('point-count'),
    Stream.$.map(_ => parseInt(_, 10)),
    Stream.$.mapEffect(_ => Effect.log(`"COUNT" updated: ${_}`) > setCount(_))
  )
  const face = Canvas.beginPath()
    > Arc(0, 0, 100, Angle.degrees(0), Angle.degrees(360)).toCanvas
    > Canvas.closePath()

  const centerPiece = Canvas.beginPath()
    > Arc(0, 0, 10, Angle.degrees(0), Angle.degrees(360), true).toCanvas
    > Canvas.closePath()

  const angleProgress = (percent: number) =>
    Canvas.beginPath()
      > Canvas.moveTo(0, 0)
      > Canvas.lineTo(100, 0 // Math.cos(Math.PI * 2 * (percent / 100)),
        // Math.sin(Math.PI * 2 * (percent / 100))
      )
      > Arc(0, 0, 10, Angle.degrees(0), Angle.degrees(360 * (percent + 1) / 100), true).toCanvas
      > Canvas.lineTo(0, 0)
      > Canvas.fill()

  const progressCircle = (percent: number) =>
    (
      Canvas.translate(512, 300)
        > Canvas.scale(2, 2)
        > Canvas.withContext(face > Canvas.setFillStyle('mauve') > Canvas.fill() > Canvas.stroke())
        > (Canvas.setFillStyle(`hsla(180deg, 50%, 50%, 0.9)`) > angleProgress(percent)) / Canvas.withContext
        > (centerPiece > Canvas.setFillStyle('red') > Canvas.stroke() > Canvas.fill()) / Canvas.withContext
    ) / Canvas.withContext

  // const _incrementStream = clickStream('start')
  // .scan(90, (s, _) => (s + 1) % 100).mapEffect(percent =>
  //   progressCircle(percent)
  // )
  const _incrementStream = clickStream('start').mapEffect(_ => Effect.log(`starting ...`) > gridLines > game())

  const updatePoints = (points: HashSet<Point>) =>
    clearCanvas
      > updateTextArea('points-json', JSON.stringify(points.toArray)).orDie
      > drawHull2(HashSet.from(points))
        .flatMap(_ =>
          updateTextArea('hull-json', JSON.stringify(_))
            > setText('hull-size', _.length.toFixed())
            > setText('points-size', points.size.toFixed())
        ).orDie
  void _tickstream
    .mapEffect(updatePoints)
    .runDrain.orDie.zipPar(
      _boomstream.mapEffect(
        _ => setText('hull-size', '0') > setText('points-size', '0')
      ).runDrain.fork
    )
    .zipPar(_pointStream.runDrain)
    .zipPar(_countstream.runDrain)
    .zipPar(_incrementStream.runDrain.zipLeft(Effect.log(`DONE with circles`)))
    .zipPar(clickStream('restart').runDrain)
    .zipPar(progressCircle(0))
    .provideSomeLayer(
      refLayer +
        pointLayer +
        Logger.consoleLoggerLayer +
        Canvas.liveLayer('canvas2').orDie
    )
    .unsafeRunSyncExit()
}
