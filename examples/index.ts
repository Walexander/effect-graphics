import { DurationInternal } from '@tsplus/stdlib/data/Duration'
import { Canvas } from 'effect-canvas/Canvas'
import { binaryTree, diamond, plant as plantCurve, snowflake } from 'effect-canvas/lsystem/curves'
import { Arc, Composite, Ellipse, Path, Point, Point as Point2, Rect } from 'effect-canvas/Shapes'
import { Turtle2D } from 'effect-canvas/Turtle2D'
import { Angle } from 'effect-canvas/Units'

import * as Boids from './boids'
import { gridLines } from './grid-lines'
import { clickStream, init2 } from './index2'

export { init2 }

const trees = Canvas.withContext(
  (Canvas.setLineWidth(1)
    > Canvas.translate(300, 600)
    > Canvas.scale(1.25, 1.25)
    > Canvas.setStrokeStyle('orange')
    > binaryTree(4))
    & binaryTree(5)
    & binaryTree(6)
    & binaryTree(7)
)

const myPlant = Canvas.withContext(
  Canvas.setLineWidth(1)
    > Canvas.setStrokeStyle('hsla(68, 40%, 50%, 0.85)')
    // Canvas.setFillStyle('hsla(68, 40%, 50%, 0.25)') >
    // Canvas.fillRect({ height, width, x: 0, y: 0 }) >
    > Canvas.translate(50, 575)
    > plantCurve(6)
    > Canvas.stroke()
)

const kochCurveExample = Canvas.withContext(
  // Canvas.setFillStyle('hsla(0, 0%, 0%, 0.25)') >
  Canvas.setStrokeStyle('red')
    // Canvas.fillRect({ height, width, x: 0, y: 0 }) >
    > Canvas.translate(420, 250)
    > Canvas.scale(1, 1)
    > diamond(4).zipPar(snowflake(4))
    > Canvas.stroke()
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

function spiralMaker(total: number) {
  const primes = (max: number) =>
    sieve(
      Stream.unfold(2, _ => (_ <= max ? Maybe.some([_, _ + 1]) : Maybe.none))
    )
  const makeSpirals = (primes: Chunk<number>, total: number) =>
    Stream.unfold(1, start => Maybe.some([[start, start ** 2] as const, start + 2]))
      .map(
        ([_1, _2]) => [_1, _2, Math.pow((total - _1 / 2) / total, 3)] as const
      )
      .take(total)
      .tap(([s, sq, delay]) =>
        Effect.serviceWithEffect(Turtle2D.Tag, turtle =>
          Effect.forEachWithIndex(
            Chunk.range(Math.max(1, (s - 2) ** 2 + 1), sq),
            (n, index) =>
              Canvas.withContext(paintSpiralTile(n, s, primes, turtle, 1))
                > (isCornerSquare(n, sq, s, index) ? turtle.turn(-90) : Effect.unit)
          )).delay(new DurationInternal(Math.abs(1 - delay) * 1e2))
      )

  const paintSpiralTile = (
    n: number,
    s: number,
    primes: Chunk<number>,
    turtle: Turtle2D,
    distance: number
  ) =>
    (primes.elem(Equivalence.number, n)
        || primes.toArray.every(prime => n < prime || n % prime != 0)
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
  const scaleVector = Point2(0.7, 0.7)
  const dims = Point2(600, 600)
  const scaledDims = dims / scaleVector
  const xlate = scaledDims / Point2(2, 2)
  // Canvas.drawTo('canvas1', gridLines)

  const primeSquare = Canvas.withContext(
    Canvas.scale(scaleVector.x, scaleVector.y)
      > Canvas.translate(xlate.x, xlate.y)
      > Canvas.rotate(Angle.degrees(90).radians)
      > spiralMaker(22)
  )
  const all = (gridLines > kochCurveExample > trees > myPlant) / Canvas.withContext
  Boids.simulationEngine.provideLayer(
    Logger.consoleLoggerLayer + Canvas.liveLayer('canvas4')
  ).unsafeRunPromise()
  document
    .getElementById('koch-snowflake')
    ?.addEventListener('click', () => draw(kochCurveExample))
  document.getElementById('btree')?.addEventListener('click', () => draw(trees))
  document
    .getElementById('plant')
    ?.addEventListener('click', () => draw(myPlant))
  document
    .getElementById('prime-squares')
    ?.addEventListener('click', () => draw(primeSquare))
  document
    .getElementById('clear')
    ?.addEventListener('click', () => draw(gridLines))
  document.getElementById('all')?.addEventListener('click', () => draw(all))
}
