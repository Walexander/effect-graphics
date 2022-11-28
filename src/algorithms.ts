import { Point } from './Shapes'

const minYPoint = Associative.min(Point.OrdYX)
const minYMonoid = AssociativeIdentity.fromAssociative(<Point> { x: Infinity, y: Infinity }, minYPoint)

export function convexHull(points: HashSet<Point>): Array<Point> {
  return points.size <= 2 ? points.toArray : pipe(
    AssociativeIdentity.fold(minYMonoid)(points),
    start => [start, Chunk.from(points).filter(_ => start != _)] as const,
    ([start, rest]) => {
      return pipe(
        rest.sort(start.getOrdByAngleFrom),
        (candidates) => hullScan(start, candidates.append(start).toArray)
      )
    }
  )
}

// [{"x":425,"y":28},{"x":66,"y":38},{"x":150,"y":93},{"x":150,"y":93},{"x":73,"y":146}]
function hullScan(start: Point, points: Array<Point>): Point[] {
  const stack = [start, points[0]!]
  const peek = (s: Point[]) => [s[s.length - 2]!, s[s.length - 1]!] as const

  points.slice(0).forEach(point => {
    while (stack.length > 1 && !isLeft(...peek(stack))(point)) {
      // @eslint-ignore
      stack.pop()
    }
    stack.push(point)
  })
  return stack
}
const isLeft = (p1: Point, p2: Point) =>
  (p3: Point): boolean => (p2.x - p1.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p3.x - p1.x) > 0
