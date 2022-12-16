import type { Render } from 'effect-canvas/Canvas'
import { Canvas } from 'effect-canvas/Canvas'
import { Point } from 'effect-canvas/Shapes/Point'

/** @tsplus type graphics/Rect */
export interface Rect extends Case {
  _tag: 'Rect'
  min: Point
  max: Point
}
/** @tsplus type graphics/RectAspects */
export interface RectAspects {}
/** @tsplus type graphics/RectOps */
export interface RectOps {
  $: RectAspects
}
export const Rect: RectOps = {
  $: {}
}
const make = Case.tagged<Rect>('Rect')

/**
 * @tsplus static graphics/RectOps __call
 * @tsplus graphics/RectOps make
 */
export function makeRect(x: number, y: number, width: number, height: number): Rect {
  return make({
    min: Point(x, y),
    max: Point(x + width, y + height)
  })
}
/** @tsplus getter graphics/Rect toCanvas */
export function renderRectangle(self: Rect): Render<never, void> {
  return Canvas.rect(
    self.min.x,
    self.min.y,
    self.max.x - self.min.x,
    self.max.y - self.min.y
  )
}

/** @tsplus getter graphics/Rect vertices */
export function getRectangleVertices(self: Rect): [Point, Point, Point, Point] {
  return [
    self.min,
    Point(self.min.x, self.max.y),
    self.max,
    Point(self.max.x, self.min.y)
  ]
}
