import type { Point } from 'effect-canvas/Canvas'
import { Canvas } from 'effect-canvas/Canvas'

import { gridLines } from './index'

export const randomPoint = Canvas.dimensions().flatMap(({ height, width }) =>
  Effect.random.flatMap(rnd => rnd.nextIntBetween(10, width - 10).zip(rnd.nextIntBetween(10, height - 10)))
    .map(([x, y]) => <Point> { x, y })
)

const points = Effect.loop(0, (x) => x < 5, (x) => x + 1)(_ => randomPoint)
  .flatMap(_ =>
    Effect.collect(_, (point) =>
      Canvas.withContext(
        Canvas.setFillStyle('red') >
        Canvas.beginPath() >
          Canvas.arc({
            x: point.x,
            y: point.y,
            radius: 3,
            start: 0,
            counterclockwise: false,
            end: Math.PI * 2
          }) > Canvas.fill()
      ))
  )
  .unit
  .orDie

export const init2 = () => Canvas.drawTo('canvas2', gridLines > points)
