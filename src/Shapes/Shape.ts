import type { Renderable } from 'effect-canvas/Renderable'
import type { Arc } from 'effect-canvas/Shapes/Arc'
import type { Composite } from 'effect-canvas/Shapes/Composite'
import type { Ellipse } from 'effect-canvas/Shapes/Ellipse'
import type { Path } from 'effect-canvas/Shapes/Path'
import type { Point } from 'effect-canvas/Shapes/Point'
import type { Rect } from 'effect-canvas/Shapes/Rectangle'

/** @tsplus type graphics/Shape */
export type Shape = Rect | Ellipse | Path | Composite | Arc | Point
const draw = (item: Shape): Effect<CanvasRenderingContext2D, never, void> =>
  pipe(
    item,
    Match.tagFor<Shape>()({
      Path: _ => _.toCanvas,
      Composite: _ => _.toCanvas,
      Rect: _ => _.toCanvas,
      Arc: _ => _.toCanvas,
      Ellipse: _ => _.toCanvas,
      Point: _ => _.toCanvas
    })
  )

/** @tsplus getter graphics/Shape canvasRenderer */
export const ShapeRenderable: Renderable<Shape, CanvasRenderingContext2D, never> = {
  draw
}
