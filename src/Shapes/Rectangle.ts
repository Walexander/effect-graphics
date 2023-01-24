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
/**
 * @tsplus static graphics/RectOps fromMinMax
 */
export const make = Case.tagged<Rect>('Rect')

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
/** @tsplus getter graphics/Rect vertices */
export function getRectangleVertices(self: Rect): [Point, Point, Point, Point] {
  return [
    self.min,
    Point(self.min.x, self.max.y),
    self.max,
    Point(self.max.x, self.min.y)
  ]
}
/** @tsplus getter graphics/Rect width */
export function getRectangleWidth(self: Rect): number {
  return self.max.x - self.min.x
}
/** @tsplus getter graphics/Rect height */
export function getRectangleHeight(self: Rect): number {
  return self.max.y - self.min.y
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
export const empty = make({
  min: Point(0, 0),
  max: Point(0, 0)
})
/** @tsplus getter graphics/Rect midpoint */
export function rectMidpoint(self: Rect) {
  return self.min.midpoint(self.max)
}

/** @tsplus getter graphics/Rect split */
export function split(self: Rect): [Rect, Rect, Rect, Rect] {
  const mid = rectMidpoint(self)
  return [
    make({
      min: Point(self.min.x, mid.y),
      max: Point(mid.x, self.max.y)
    }),
    make({
      min: mid,
      max: self.max
    }),
    make({
      min: self.min,
      max: mid
    }),
    make({
      min: Point(mid.x, self.min.y),
      max: Point(self.max.x, mid.y)
    })
  ]
}
/**
 * @tsplus getter graphics/Rect overlaps
 * @tsplus static graphics/RectAspects overlaps
 */
export function overlaps(self: Rect): (bounds: Rect) => boolean {
  return bounds =>
    bounds.min.x <= self.max.x
    && bounds.max.x >= self.min.x
    && bounds.min.y <= self.max.y
    && bounds.max.y >= self.min.y
}
/**
 * @tsplus getter graphics/Rect contains
 * @tsplus static graphics/RectAspects contains
 */
export function containsPoint(self: Rect): (point: Point) => boolean {
  return point =>
    point.x >= self.min.x && point.x <= self.max.x
    && point.y >= self.min.y && point.y <= self.max.y
}
