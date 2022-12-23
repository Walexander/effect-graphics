import { DurationInternal } from '@tsplus/stdlib/data/Duration'
import { Canvas } from 'effect-canvas/Canvas'
import { binaryTree, diamond, plant as plantCurve, snowflake } from 'effect-canvas/lsystem/curves'
import { domLive } from 'effect-canvas/services/Dom'
import type { Shape } from 'effect-canvas/Shapes'
import { Arc, Composite, Ellipse, Path, Point, Point as Point2, Rect, ShapeRenderable } from 'effect-canvas/Shapes'
import { getLiveTurtle2D as turtleLayer, Turtle2D } from 'effect-canvas/Turtle2D'
import { Angle } from 'effect-canvas/Units'

import type { MovingObject } from './boids'
import { drawBoid } from './boids'
import * as Boids from './boids'
import { gridLines } from './grid-lines'
import { clickStream, init2 } from './index2'

export { init2 }

const composite = Composite([
  Ellipse(
    50,
    50,
    100,
    50 * Math.sqrt(2),
    Angle.degrees(0),
    Angle.degrees(0),
    Angle.turns(1),
    true
  ),
  Point2(0, 0),
  Rect(0, 0, 100, 100),
  Point2(0, 0),
  Arc(50, 50, 50 * Math.sqrt(2), Angle.degrees(45 + 90), Angle.degrees(45 + 90 + 360)),
  Path([Point2(50, 0), Point2(0, 100), Point2(100, 100), Point(50, 0)])
])
enum RunningState {
  Playing,
  Paused
}
const edgeBox = Point(1024, 600).scale(Point.fromScalar(1))

const speedLimit = Point(10, 10)
const Running = Service.Tag<Ref<boolean>>()
const isRunning = Effect.serviceWithEffect(Running, ref => ref.get)
const toggle = Effect.serviceWithEffect(Running, ref => ref.update(_ => !_))
const tickBoids = (config: Boids.Config) =>
  (boids: MovingObject[]) =>
    isRunning.map(_ => _ ? Boids.boidLoop(config)(boids) : boids)
      .zipLeft(Canvas.withContext(
        Canvas.setFillStyle('azure') >
          Canvas.clearRect(0, 0, edgeBox.x, edgeBox.y) >
          Canvas.rect(0, 0, edgeBox.x, edgeBox.y) >
          Canvas.fill()
      ))
      .tap(drawFlock(config.vision))
      .tap(_ =>
        Canvas.withContext(
          Canvas.translate(20, 400)
            > Canvas.scale(1.5, 1.5)
            > Boids.drawSummary(config, Boids.flock(_, 35)(_[0]!), _[0]!, _[1]!)
        ) > Canvas.withContext(
          Canvas.translate(520, 400)
            > Canvas.scale(1.5, 1.5)
            > Boids.drawSummary(config, Boids.flock(_, 35)(_[1]!), _[1]!, _[0]!)
        )
      )

const boidSimulation = domLive
  .zip(Boids.randomBoids(32, edgeBox.scale(Point(1, 1))))
  .flatMap(([a, boids]) =>
    a.renderLoop(
      { boids: boids.toArray },
      ({ boids, ...rest }) =>
        Effect.serviceWithEffect(Boids.Config, _ => _.get.map(tickBoids))
          .flatMap(update => update(boids))
          .map(_ => ({ ...rest, boids: _ }))
    )
  )

const trees = Canvas.withContext(
  (Canvas.setLineWidth(1) >
    Canvas.translate(300, 600) >
    Canvas.scale(1.25, 1.25) >
    Canvas.setStrokeStyle('orange') >
    binaryTree(4)) &
    binaryTree(5) &
    binaryTree(6) &
    binaryTree(7)
)

const myPlant = Canvas.withContext(
  Canvas.setLineWidth(1) >
    Canvas.setStrokeStyle('hsla(68, 40%, 50%, 0.85)') >
    // Canvas.setFillStyle('hsla(68, 40%, 50%, 0.25)') >
    // Canvas.fillRect({ height, width, x: 0, y: 0 }) >
    Canvas.translate(50, 575) >
    plantCurve(6) >
    Canvas.stroke()
)

const kochCurveExample = Canvas.withContext(
  // Canvas.setFillStyle('hsla(0, 0%, 0%, 0.25)') >
  Canvas.setStrokeStyle('red') >
    // Canvas.fillRect({ height, width, x: 0, y: 0 }) >
    Canvas.translate(420, 250) >
    Canvas.scale(1, 1) >
    diamond(4).zipPar(snowflake(4)) >
    Canvas.stroke()
)

const draw = (program: Effect<CanvasRenderingContext2D, never, void>) =>
  program
    .provideSomeLayer(Canvas.liveLayer('canvas1'))
    .provideSomeLayer(Logger.consoleLoggerLayer)
    .unsafeRunPromise()

function sieve(
  candidates: Stream<never, never, number>
): Stream<never, never, number> {
  return candidates.take(1).flatMap(prime =>
    Stream.succeed(prime).concat(
      pipe(
        candidates.drop(1).filter(candidate => candidate % prime != 0),
        sieve
      )
    )
  )
}

const drawFlock = (vision: number) =>
  (as: MovingObject[]) =>
    Canvas.withContext(
      Canvas.beginPath() >
        Effect.forEachWithIndex(as, (_, i) =>
          drawBoid(
            {
              ..._,
              color: i == 1
                ? 'black'
                : `hsla(${_.velocity.angleTo(Point(0, 0)).degrees}deg, 50%, 50%, 1.0)`
            },
            i == 0 || i == 1 ? vision : 0
          ))
    )

function spiralMaker(total: number) {
  const primes = (max: number) =>
    sieve(
      Stream.unfold(2, _ => (_ <= max ? Maybe.some([_, _ + 1]) : Maybe.none))
    )
  const makeSpirals = (primes: Chunk<number>, total: number) =>
    Stream.unfold(1, start => Maybe.some([[start, start ** 2] as const, start + 2]))
      .map(([_1, _2]) => [_1, _2, Math.pow((total - _1 / 2) / total, 3)] as const)
      .take(total)
      .tap(([s, sq, delay]) =>
        Effect.serviceWithEffect(
          Turtle2D.Tag,
          turtle =>
            Effect.forEachWithIndex(
              Chunk.range(Math.max(1, (s - 2) ** 2 + 1), sq),
              (n, index) =>
                Canvas.withContext(paintSpiralTile(n, s, primes, turtle, 1)) >
                  (isCornerSquare(n, sq, s, index)
                    ? turtle.turn(-90)
                    : Effect.unit)
            )
        ).delay(new DurationInternal(Math.abs(1 - delay) * 1e2))
      )

  const paintSpiralTile = (
    n: number,
    s: number,
    primes: Chunk<number>,
    turtle: Turtle2D,
    distance: number
  ) =>
    (primes.elem(Equivalence.number, n) ||
        primes.toArray.every(prime => n < prime || n % prime != 0)
      ? Canvas.setStrokeStyle(`hsla(${s * 6}deg, 50%, 50%, 1.0)`).zip(
        Canvas.setLineWidth(15)
      )
      : Canvas.setStrokeStyle(`hsla(${s * 6}deg, 50%, 20%, 0.5)`).zip(
        Canvas.setLineWidth(5)
      )).zip(turtle.drawForward(distance * 20))

  function isCornerSquare(
    candidate: number,
    oddSquare: number,
    oddRoot: number,
    index: number
  ) {
    return (
      candidate != oddSquare && (index == 0 || (1 + index) % (oddRoot - 1) == 0)
    )
  }
  return primes(total).runCollect.flatMap(primes =>
    makeSpirals(primes, total).runDrain.provideSomeLayer(
      Turtle2D.liveLayer({ x: 0, y: 0, theta: 0 })
    )
  )
}

export function init() {
  const scaleVector = Point2(0.70, 0.70)
  const dims = Point2(600, 600)
  const scaledDims = dims / scaleVector
  const xlate = scaledDims / Point2(2, 2)
  // Canvas.drawTo('canvas1', gridLines)

  const primeSquare = Canvas.withContext(
    Canvas.scale(scaleVector.x, scaleVector.y) >
      Canvas.translate(xlate.x, xlate.y) >
      Canvas.rotate(Angle.degrees(90).radians) >
      spiralMaker(22)
  )
  const all = (gridLines > kochCurveExample > trees > myPlant) / Canvas.withContext
  const simulation = boidSimulation.zipPar(
    clickStream('toggle').tap(_ =>
      toggle
        .zipLeft(
          Effect.serviceWithEffect(Running, ref => ref.get.tap(_ => Effect.log(`got toggle tick ${_}`)))
        )
        .zipLeft(
          Effect.serviceWithEffect(
            Boids.Config,
            ref =>
              ref.updateAndGet(c => ({
                ...c,
                speedLimit: c.speedLimit.plus(Point.fromScalar(1))
              })).tap(_ => Effect.sync(() => console.table(_)))
          )
        )
    ).runDrain
  )


  // clickStream('boidy')
  //   .scanEffect(
  //     [
  //       { position: Point(70, 100), velocity: Point(-5, -5) },
  //       { position: Point(100, 100), velocity: Point(-5, 0) },
  //       { position: Point(50, 100), velocity: Point(5, -2.5) }
  //     ],
  //     boids =>
  //       Effect.serviceWith(Boids.Config, tickBoids)
  //         .flatMap(update => update(boids))
  //         .provideSomeLayer(Canvas.liveLayer('canvas3'))
  //   )
  //   .ensuring(Effect.log(`This is over`))
  //   .runDrain
  //   .provideSomeLayer(
  //     Logger.consoleLoggerLayer +
  //       Layer.fromValue(RunningStateService, RunningState.Playing) +
  //       Ref.make(true).toLayer(Running) +
  //       Layer.fromValue(Boids.Config, {
  //         bounds: edgeBox,
  //         vision: 100,
  //         minDistance: 35,
  //         speedLimit,
  //         scales: {
  //           alignment: Point.fromScalar(0.005),
  //           cohesion: Point.fromScalar(0.005),
  //           separation: Point.fromScalar(0.05)
  //         }
  //       })
  //   )
  //   .catchAllCause(Effect.logFatalCause)
  //   .scoped.unsafeRunPromise()
  // .flatMap(_ =>
  //   clickStream('stateful').scanEffect(
  //     _.toArray,
  //     boids => tickBoids(boids)
  //   )
  // )

  // .unsafeRunPromise()
  clickStream('stateful')
    .tap(_ => simulation.unit)
    .runDrain
    .provideSomeLayer(
      Logger.consoleLoggerLayer +
        Ref.make(false).toLayer(Running) + Canvas.liveLayer('canvas3') +
        Boids.configLive(
          {
            bounds: edgeBox,
            speedLimit,
            vision: 105,
            minDistance: 15,
            scales: {
              alignment: Point.fromScalar(0.0125),
              cohesion: Point.fromScalar(0.0075),
              separation: Point.fromScalar(0.125)
            }
          }
        )
    )
    .unsafeRunPromise()
  // document
  //   .getElementById('stateful')
  //   ?.addEventListener('click', () =>
  //     simulation
  //       .provideLayer(Ref.make(false).toLayer(Running))
  //       .unsafeRunPromise())
  document
    .getElementById('koch-snowflake')
    ?.addEventListener('click', () => draw(kochCurveExample))
  document.getElementById('btree')?.addEventListener('click', () => draw(trees))
  document
    .getElementById('plant')
    ?.addEventListener('click', () => draw(myPlant))
  document.getElementById('prime-squares')?.addEventListener('click', () => draw(primeSquare))
  document.getElementById('clear')?.addEventListener('click', () => draw(gridLines))
  document.getElementById('all')?.addEventListener('click', () => draw(all))
}
