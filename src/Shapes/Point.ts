import type { Render } from 'effect-canvas/Canvas'
import { Canvas } from 'effect-canvas/Canvas'
import { Angle } from 'effect-canvas/Units'

interface PointStruct {
  readonly x: number
  readonly y: number
}
/** @tsplus implicit */
export const pointDecoder = Decoder<Point>(u =>
  Derive<Decoder<PointStruct>>().decodeResult(u).map(_ => Point(_.x, _.y))
)

/** @tsplus type graphics/Point */
export interface Point extends Case {
  _tag: 'Point'
  x: number
  y: number
}
/** @tsplus type graphics/PointAspects */
export interface PointAspects {}

/** @tsplus type graphics/PointOps */
export interface PointOps {
  $: PointAspects
}
export const Point: PointOps = {
  $: {}
}
const makePoint_ = Case.tagged<Point>('Point')
/**
 * @tsplus static graphics/PointOps __call
 * @tsplus static graphics/PointOps make
 */
export const makePoint = (x: number, y: number): Point => makePoint_({ x, y })

/**
 * @tsplus pipeable graphics/Point angleTo
 * @tsplus static graphics/PointAspects angleTo
 */
export function angleTo(to: Point): (from: Point) => Angle {
  return (from) => Angle.radians(Math.atan2(to.x - from.x, to.y - from.y))
}
/**
 * @tsplus pipeable graphics/Point cross
 * @tsplus static graphics/PointAspects cross
 */
export function cross(b: Point): (a: Point) => number {
  return (a) => a.x * b.y - a.y * b.x
}
/**
 * @tsplus pipeable-operator graphics/Point *
 * @tsplus pipeable graphics/Point scale
 * @tsplus static graphics/PointAspects scale
 */
export function scale(scale: Point): (from: Point) => Point {
  return (from) => Point(scale.x * from.x, scale.y * from.y)
}
/**
 * @tsplus pipeable-operator graphics/Point +
 * @tsplus pipeable graphics/Point plus
 * @tsplus static graphics/PointAspects plus
 */
export function plus(scale: Point): (from: Point) => Point {
  return (from) => Point(scale.x + from.x, scale.y + from.y)
}
/**
 * @tsplus pipeable-operator graphics/Point %
 * @tsplus pipeable graphics/Point modulo
 * @tsplus static graphics/PointAspects modulo
 */
export function modulo(modulo: Point): (from: Point) => Point {
  return (from) => Point(from.x % modulo.x, from.y % modulo.y)
}

/**
 * @tsplus getter graphics/Point show
 * @tsplus static graphics/PointAspects show
 */
export function show(to: Point): string {
  return `(${to.x}, ${to.y})`
}
/**
 * @tsplus getter graphics/Point round
 * @tsplus static graphics/PointAspects round
 */
export function round(to: Point): Point {
  return Point(Math.round(to.x), Math.round(to.y))
}

/**
 * @tsplus pipeable graphics/Point distanceTo
 * @tsplus static graphics/PointAspects distanceTo
 */
export function distanceTo(to: Point) {
  return (from: Point) => Math.sqrt((to.x - from.x) ^ 2 + (to.y - from.y) ^ 2)
}

/**
 * @tsplus getter graphics/Point getOrdByAngleFrom
 * @tsplus static graphics/PointAspects getOrdByAngleFrom
 */
export function getOrdByAngleFrom(from: Point) {
  return Ord.number.contramap<number, Point>(_ => from.angleTo(_).radians)
}

/**
 * @tsplus static graphics/PointOps OrdYX
 */
export const ordYX = Ord.getAssociative<Point>().combine(
  Ord.number.contramap(_ => _.y),
  Ord.number.contramap(_ => _.x)
)
/**
 * @tsplus static graphics/PointOps OrdXY
 */
export const ordXY = Ord.getAssociative<Point>().combine(
  Ord.number.contramap(_ => _.x),
  Ord.number.contramap(_ => _.y)
)
/** @tsplus static graphics/PointOps random */
export const randomPoint = (min: Point, max: Point) =>
  Effect.random.flatMap(rnd => rnd.nextIntBetween(min.x, max.x) + rnd.nextIntBetween(min.y, max.y))
    .map(([x, y]) => Point(x, y))

/** @tsplus static graphics/PointOps randomPoints */
export const randomPoints = (count: number, min: Point, max: Point): Effect<never, never, HashSet<Point>> =>
  Effect.collectAll(
    Chunk.range(1, count).map(_ => randomPoint(min, max))
  ).map(_ => _.toHashSet)

/**
 * Test if the two points are equal
 *
 * @tsplus operator graphics/Point ==
 */
export const pointEquals = (a: Point, b: Point) => ordXY.compare(a, b) == 0
/**
 * Test whether two points are not equal
 *
 * @tsplus static graphics/PointOps Equivalence
 */
export const pointEquivalence = Equivalence(pointEquals)

/**
 * Test whether two points are not equal
 *
 * @tsplus operator graphics/Point !=
 */
export const pointNotEquals = (a: Point, b: Point) => ordXY.compare(a, b) != 0

/**
 * @tsplus getter graphics/Point divideBy
 * @tsplus static graphics/PointAspects divideBy
 * @tsplus pipeable-operator graphics/Point /
 */
export function divideBy(divisor: Point): (dividend: Point) => Point {
  return (dividend) => Point(dividend.x / divisor.x, dividend.y / divisor.y)
}
/** @tsplus getter graphics/Point toCanvas */
export function renderPoint(self: Point): Render<never, void> {
  return Canvas.moveTo(self.x, self.y)
}
