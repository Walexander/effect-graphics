import * as B from 'benny'
import * as QT from 'effect-canvas/QuadTree'
import { Point, Rect } from 'effect-canvas/Shapes'

import * as Boids from '../boids'

const randomPoints = (total: number, bounding: Point) =>
  Point.randomPoints(total, Point(0, 0), bounding).unsafeRunSync().toArray

const testPoints = randomPoints(1e2, Point(500, 500))
export const withinRange = (looking: Point, distance: number) =>
  (candidate: Point) =>
    looking != candidate
    && candidate.distanceToSq(looking) <= (distance ** 2)
const test = Chunk.range(0, testPoints.length - 1).zip(testPoints).toArray
const testChunk = Chunk.from(test)

console.dir(
  QT.partition(test, ([_, p]) => p.x < 200).map(_ => _.map(([, p]) => p.x))
)
QT.fromList<number>(1, 1)([Rect(0, 0, 500, 500), test])
B.suite(
  'QuadTree',
  B.add('build from points', () => {
    QT.fromList<number>(1, 1)(
      [Rect(0, 0, 500, 500), test]
    )
  }),
  B.add('lookup from tree', () => {
    const lookup = QT.queryFromList<number>(1, 1)([Rect(0, 0, 500, 500), test])
    const values = test.map(([_, p]) => lookup(Rect(p.x - 20, p.y - 20, 20, 20)))
    void values
  }),
  B.add('lookup from Chunk', () => {
    const values = testChunk.map(([, p]) => testPoints.filter(withinRange(p, 25)))
    void values
  }),
  B.add('lookup from array', () => {
    const values = test.map(([_, p]) => test.filter(([, candidate]) => withinRange(p, 25)(candidate)))
    void values
  }),
  B.cycle(),
  B.complete()
)
