import type { Shape } from 'effect-canvas/Shapes/Shape'
import { ShapeRenderable } from 'effect-canvas/Shapes/Shape'

/** @tsplus type graphics/Composite */
export interface Composite extends Case {
  _tag: 'Composite'
  shapes: Shape[]
}
/** @tsplus type graphics/CompositeAspects */
export interface CompositeAspects {}
/** @tsplus type graphics/CompositeOps */
export interface CompositeOps {
  $: CompositeAspects
}
export const Composite: CompositeOps = {
  $: {}
}

const make = Case.tagged<Composite>('Composite')
/**
 * @tsplus static graphics/CompositeOps __call
 * @tsplus static graphics/CompositeOps fromList
 */
export function compositeFromList(shapes: Collection<Shape>) {
  return make({
    shapes: shapes.toArray
  })
}
/** @tsplus getter graphics/Composite toCanvas */
export function compositeToCanvas(self: Composite) {
  return Effect.forEachDiscard<CanvasRenderingContext2D, never, Shape, void>(
    self.shapes,
    shape => Effect.log(`rendering ${JSON.stringify(shape)}`) > ShapeRenderable.draw(shape)
  )
}
