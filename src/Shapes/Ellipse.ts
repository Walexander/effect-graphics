// eslint-disable-next-line import/no-cycle
import { Canvas } from 'effect-canvas/Canvas'
import { Point } from 'effect-canvas/Shapes/Point'
import { Angle } from 'effect-canvas/Units'

export type EllipseParams = {
  offset: Point
  radius: Point
  rotation: Angle
  startAngle: Angle
  endAngle: Angle
  counterclockwise: boolean
}

/** @tsplus type graphics/Ellipse */
export interface Ellipse extends Case, EllipseParams {
  _tag: 'Ellipse'
}
/** @tsplus type graphics/EllipseAspects */
export interface EllipseAspects {}
/** @tsplus type graphics/EllipseOps */
export interface EllipseOps {
  $: EllipseAspects
}
export const Ellipse: EllipseOps = {
  $: {}
}
const make = Case.tagged<Ellipse>('Ellipse')

/**
 * @tsplus static graphics/EllipseOps __call
 * @tsplus static graphics/EllipseOps make
 */
export function makeEllipse(params: EllipseParams): Ellipse
export function makeEllipse(
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  rotation: Angle,
  startAngle: Angle,
  endAngle: Angle,
  counterclockwise?: boolean
): Ellipse
export function makeEllipse(
  x: EllipseParams | number,
  y = 0,
  radiusX = 0,
  radiusY = 0,
  rotation = Angle.degrees(0),
  startAngle = Angle.degrees(0),
  endAngle = Angle.degrees(0),
  counterclockwise = false
): Ellipse {
  return typeof x == 'object' ? make(x) : make({
    offset: Point(x, y),
    radius: Point(radiusX, radiusY),
    rotation,
    startAngle,
    endAngle,
    counterclockwise
  })
}

/**
 * @tsplus getter graphics/Ellipse toCanvas
 * @tsplus static graphics/EllipseAspects toCanvas
 */
export function renderEllipse({ counterclockwise, endAngle, offset, radius, rotation, startAngle }: Ellipse) {
  return Canvas.ellipse(
    offset.x,
    offset.y,
    radius.x,
    radius.y,
    rotation.radians,
    startAngle.radians,
    endAngle.radians,
    counterclockwise
  )
}
