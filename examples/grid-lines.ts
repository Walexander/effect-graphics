import { Canvas } from 'effect-canvas/Canvas'
import { Point as Point2 } from 'effect-canvas/Shapes'

export const gridLines = Canvas.dimensions().flatMap(({ height, width }) =>
  Canvas.withContext(
    Canvas.clearRect(0, 0, width, height) >
      Canvas.setStrokeStyle('lightgrey') >
      Canvas.setFillStyle('hsla(0, 0%, 100%, 1)') >
      Canvas.beginPath() >
      Canvas.dimensions().flatMap(
        ({ height, width }) =>
          Canvas.fillRect(0, 0, width, height) >
            Effect.collect(
              Chunk.range(0, width / 10).map(_ => _ * 10),
              _ =>
                Canvas.withContext(
                  Canvas.setStrokeStyle(_ % 100 == 0 ? 'darkgrey' : 'lightgrey') >
                    gridLine(Point2(_, 0), Point2(_, height)) >
                    gridLine(Point2(_, 0), Point2(_, height))
                )
            ) >
            Effect.collect(
              Chunk.range(0, height / 10).map(_ => _ * 10),
              _ =>
                Canvas.withContext(
                  Canvas.setStrokeStyle(_ % 100 == 0 ? 'darkgrey' : 'lightgrey') >
                    gridLine(Point2(0, _), Point2(width, _))
                )
            )
      ).orDie.unit
  )
)
export const gridLine = (from: Point2, to: Point2) =>
  Canvas.withContext(
    Canvas.beginPath() >
      Canvas.moveTo(from.x, from.y) >
      Canvas.lineTo(to.x, to.y) >
      Canvas.stroke()
  )
