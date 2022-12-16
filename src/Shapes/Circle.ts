import { Point } from 'effect-canvas/Shapes/Point'

/** @tsplus type graphics/Circle */
export interface Circle extends Case {
  _tag: 'Circle'
  center: Point
  radius: number
}
/** @tsplus type graphics/CircleAspects */
export interface CircleAspects {}
/** @tsplus type graphics/CircleOps */
export interface CircleOps {
  $: CircleAspects
}
export const Circle: CircleOps = {
  $: {}
}
const make = Case.tagged<Circle>('Circle')

/**
 * @tsplus static graphics/CircleOps __call
 * @tsplus static graphics/CircleOps make
 */
export const makeCircle = (x: number, y: number, radius: number) => {
  return make({
    center: Point(x, y),
    radius
  })
}
