import { Canvas } from 'effect-canvas/Canvas'
import { Point } from 'effect-canvas/Shapes/Point'
import { Angle } from 'effect-canvas/Units'

export type ArcParams = {
  start: Angle
  end: Angle
  center: Point
  radius: number
  counterclockwise: boolean
}
/** @tsplus type graphics/Arc */
export interface Arc extends Case, ArcParams {
  _tag: 'Arc'
}
/** @tsplus type graphics/ArcAspects */
export interface ArcAspects {}
/** @tsplus type graphics/ArcOps */
export interface ArcOps {
  $: ArcAspects
}
export const Arc: ArcOps = {
  $: {}
}
const make = Case.tagged<Arc>('Arc')

/**
 * @tsplus static graphics/ArcOps __call
 * @tsplus static graphics/ArcOps make
 */
export function makeArc(params: ArcParams): Arc
export function makeArc(x: number, y: number, radius: number, start: Angle, end: Angle, counterclockwise?: boolean): Arc
export function makeArc(
  x: number | ArcParams,
  y = 0,
  radius = 0,
  start = Angle.radians(0),
  end = Angle.radians(0),
  counterclockwise = false
): Arc {
  return typeof x == 'object' ? make(x) : make({
    center: Point(x, y),
    radius,
    start,
    end,
    counterclockwise
  })
}
/** @tsplus getter graphics/Arc toCanvas */
export function toCanvas(self: Arc) {
  return Canvas.arc(
    self.center.x,
    self.center.y,
    self.radius,
    self.start.radians,
    self.end.radians,
    self.counterclockwise
  )
}
