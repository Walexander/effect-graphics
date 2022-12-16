import { Point } from 'effect-canvas/Shapes'

/** @tsplus type graphics/Triangle */
export interface Triangle extends Case {
  _tag: 'Triangle'
  vertices: [Point, Point, Point]
}
/** @tsplus type graphics/TriangleAspects */
export interface TriangleAspects {}
/** @tsplus type graphics/TriangleOps */
export interface TriangleOps {
  $: TriangleAspects
}
export const Triangle: TriangleOps = {
  $: {}
}
const make = Case.tagged<Triangle>('Triangle')
/**
 * @tsplus static graphics/TriangleOps __call
 * @tsplus static graphics/TriangleOps make
 */
export function makeTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): Triangle {
  return make({
    vertices: [Point(x1, y1), Point(x2, y2), Point(x3, y3)]
  })
}
/**
 * @tsplus static graphics/TriangleOps fromPoints
 */
export function fromPoints(v1: Point, v2: Point, v3: Point): Triangle {
  return make({
    vertices: [v1, v2, v3]
  })
}
