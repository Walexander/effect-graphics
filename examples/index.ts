import type { Render } from 'effect-canvas/Canvas'
import { Canvas } from 'effect-canvas/Canvas'
import { binaryTree, diamond, plant as plantCurve, snowflake } from 'effect-canvas/lsystem/curves'
import {
  Arc,
  Composite,
  Ellipse,
  Path,
  Point,
  Point as Point2,
  Rect,
  Shape,
  ShapeRenderable
} from 'effect-canvas/Shapes'
import { getLiveLayer as turtleLayer, Turtle2D } from 'effect-canvas/Turtle2D'
import { Angle } from 'effect-canvas/Units'

import { gridLines } from './grid-lines'
import { init2 } from './index2'

export { init2 }

Stream.range(2, 10)
  .filter(_ => _ % 2 == 1)
  .map(_ => _ ** 2)
  .mapAccum(1, (last, current) => [current, [last, current] as const])
  .flatMap(([lower, upper]) => Stream.repeat(upper).zip(Stream.range(lower, upper)))
  .tap(_ => Effect.log(`${JSON.stringify(_)}`))
// .mapEffect(number =>
//   Effect.serviceWithEffect(Turtle2D, turtle =>
//     turtle.drawForward(50).zip(
//       turtle.turn(-90)
//     ))
// )

const squaredNumbers = Stream.range(1, 6)
  .filter(_ => _ % 2 == 1)
  .map(_ => [_, _ ** 2 + 1] as const)
  .mapEffect(([start, finish]) =>
    Effect.forEachWithIndex(Chunk.range(start, finish), (current, index) =>
      Effect.serviceWithEffect(
        Turtle2D,
        turtle =>
          (current == finish ||
              start == current ||
              (index + 1) % (start - 1) == 0
            ? Effect.log(
              `turning left @ ${index}  ${start - 1} ${current}!`
            ).zipRight(turtle.turn(-90))
            : Effect.unit) > turtle.drawForward(25)
      ))
  )

export const triangle = Effect.logSpan('triangle')(
  Effect.log('... starting ...') >
    Canvas.dimensions().flatMap(({ height, width }) =>
      Canvas.withContext(
        Effect.unit > // Canvas.translate(width / 2, height / 2) >
          //   Rect(-100 / 2, -150 / 2, 100, 150).toCanvas >
          //   Canvas.fill() >
          //   Canvas.withContext(
          //     Canvas.setFillStyle('white') >
          //       Arc(0, 0, 25, Angle.degrees(0), Angle.degrees(180)).toCanvas >
          //       Canvas.stroke() >
          //       Canvas.fill()
          //   ) >
          //   Canvas.withContext(
          //     Canvas.setFillStyle('green') >
          //       Arc({
          //         center: Point2(0, 0),
          //         radius: 25,
          //         start: Angle.degrees(0),
          //         end: Angle.degrees(180),
          //         counterclockwise: true
          //       }).toCanvas >
          //       Canvas.stroke() >
          //       Canvas.fill()
          //   )
          // > Canvas.withContext(
          //   Canvas.rotate(Angle.degrees(45).radians) >
          //     Canvas.withContext(
          //       Path(
          //         [Point2(0, 0), Point2(100, 100), Point2(100, -100), Point2(0, 0)],
          //         false
          //       ).toCanvas >
          //         Canvas.setStrokeStyle('orange') >
          //         Canvas.setLineWidth(3) >
          //         Canvas.stroke()
          //     ) >
          //     Canvas.withContext(
          //       Path(
          //         [
          //           Point2(0, 0),
          //           Point2(100, 100),
          //           Point2(100, -100),
          //           Point2(0, 0)
          //         ].map(_ => _.scale(Point2(-1, -1))),
          //         false
          //       ).toCanvas
          //         > Canvas.setStrokeStyle('purple')
          //         > Canvas.setFillStyle('purple')
          //         > Canvas.setLineWidth(10)
          //         > Canvas.stroke()
          //     )
          // )
          Canvas.translate(300, 300) >
          Canvas.beginPath() >
          composite.toCanvas >
          Canvas.setStrokeStyle('red') >
          Canvas.stroke()
      )
    )
)
const rect100x100 = Rect(0, 0, 100, 100)
const composite = Composite([
  Ellipse(
    50,
    50,
    150,
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
  // Arc(0, 0, 50, Angle.degrees(0), Angle.degrees(180), true),
])

export const smallTriangle = Effect.logSpan('draw2')(
  Effect.log('... starting ...') >
      Canvas.beginPath() >
      Canvas.moveTo(75, 50) >
      Canvas.moveTo(100, 75) >
      Canvas.moveTo(100, 25) >
      Canvas.closePath() <
    Effect.log('... ending ...')
)
export const circle = Effect.logSpan('drawCircle')(
  Effect.log('... starting ...') >
      Canvas.beginPath() >
      Canvas.moveTo(400, 300) >
      Canvas.arc(300, 300, 100, 0, Math.PI, false) >
      Canvas.lineTo(400, 300) >
      Canvas.closePath() <
    Effect.log('... ending ...')
)
export const flippedCircle = Canvas.save() >
  Canvas.setFillStyle('#000000') >
  circle >
  Canvas.fill() >
  Canvas.restore()

const ctx = Canvas
const cross = Canvas.withContext(
  ctx.setFillStyle('gray') >
    ctx.fillRect(80, 60, 140, 30) >
    // Matrix transformation
    ctx.translate(150, 75) >
    ctx.rotate(Math.PI / 2) >
    ctx.translate(-150, -75) >
    // Rotated rectangle
    ctx.setFillStyle('red') >
    ctx.fillRect(80, 60, 140, 30)
)

export const trees = Canvas.withContext(
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
        // .tap(candidate => Effect.log(`\t ${candidate} % ${prime} = 0 ? ${candidate % prime == 0}`)),
        sieve
      )
    )
  )
}
const primes = (max: number) => sieve(Stream.unfold(2, _ => (_ <= max ? Maybe.some([_, _ + 1]) : Maybe.none)))
const makeSpirals = (primes: Chunk<number>, total: number) =>
  Stream.unfold(1, start => Maybe.some([[start, start ** 2] as const, start + 2]))
    .take(total)
    .tap(([s, sq]) =>
      Effect.forEachWithIndex(
        Chunk.range(Math.max(1, (s - 2) ** 2 + 1), sq),
        (n, index) =>
          Effect.serviceWithEffect(
            Turtle2D,
            turtle =>
              Canvas.withContext(paintSpiralTile(n, s, primes, turtle)) >
                // n != sq && (index == 0 || (1 + index) % (s - 1) == 0) ?
                (isCornerSquare(n, sq, s, index) ? turtle.turn(-90) : Effect.unit)
          )
      )
    )
const paintSpiralTile = (
  n: number,
  s: number,
  primes: Chunk<number>,
  turtle: Turtle2D
) =>
  (primes.elem(Equivalence.number, n) ||
      primes.toArray.every(prime => n < prime || n % prime != 0)
    ? Canvas.setStrokeStyle(`hsla(0deg, 50%, 0%, 1.0)`).zip(
      Canvas.setLineWidth(15)
    )
    : Canvas.setStrokeStyle(`hsla(${s * 6}deg, 50%, 20%, 0.5)`).zip(
      Canvas.setLineWidth(5)
    )).zip(turtle.drawForward(20))

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
export function init() {
  const scaleVector = Point2(0.45, 0.45)
  const dims = Point2(600, 600)
  const scaledDims = dims / scaleVector
  const xlate = scaledDims / Point2(2, 2)
  const clear = xlate * Point2(-1, -1)
  console.log(
    `translate: ${xlate.show} ${(xlate / Point2(0.75, 0.75)).show} ${xlate.divideBy(Point2(2, 2)).show}`
  )
  Canvas.drawTo('canvas1', gridLines)
  document
    .getElementById('btree')
    ?.addEventListener('click', () => draw(triangle))
  document
    .getElementById('koch-snowflake')
    ?.addEventListener('click', () => draw(kochCurveExample))
  // document.getElementById('btree')?.addEventListener('click', () => draw(trees))
  document.getElementById('triangle')?.addEventListener('click', () =>
    draw(
      primes(300).runCollect.flatMap(
        primes =>
          Stream.repeat('x')
            .mapAccum(0, current => [current + 1, Math.max(1, current)])
            .mapEffect(iteration =>
              Canvas.withContext(
                Canvas.scale(scaleVector.x, scaleVector.y) >
                  Canvas.translate(xlate.x, xlate.y) >
                  Canvas.clearRect(
                    clear.x,
                    clear.y,
                    scaledDims.x,
                    scaledDims.y
                  ) >
                  makeSpirals(primes, iteration).runDrain.provideSomeLayer(
                    turtleLayer({ x: 0, y: 0, theta: 0 })
                  )
              ).delay((1e2).millis)
            )
            .take(45).runDrain
      )
    ))
  // document.getElementById('cross')?.addEventListener('click', () => draw(cross))
  // document.getElementById('circle')?.addEventListener('click', () =>
  //   draw(
  //     circle > Canvas.stroke()
  //       > Canvas.save() > Canvas.setFillStyle('#ffffff') > Canvas.fill() > Canvas.restore()
  //   ))
  document
    .getElementById('clear')
    ?.addEventListener('click', () => draw(gridLines))
  document
    .getElementById('all')
    ?.addEventListener('click', () =>
      Canvas.drawTo(
        'canvas1',
        (gridLines > kochCurveExample > trees > myPlant) / Canvas.withContext
      ))
}

const rotateDrawing = (drawing: Render<never, any>, rotation: Angle) =>
  Canvas.withContext(
    Canvas.translate(300, 300).zip(
      Canvas.clearRect(-300, -300, 600, 600).zip(
        Canvas.withContext(
          Canvas.rotate(rotation.radians).zip(Canvas.withContext(drawing))
        )
      )
    )
  )
