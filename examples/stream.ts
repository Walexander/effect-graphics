import { Recursive } from '@tsplus/stdlib/prelude/Recursive'
import * as QT from 'effect-canvas/QuadTree'
import { Point, Point as Point2, Rect } from 'effect-canvas/Shapes'

import { addInCircle } from './boids'

interface EventQueue<E> extends Queue<E> {}

const EventQueue = <E>() => Service.Tag<EventQueue<E>>()

const qt = QT.fromList<number>(4)(
  [
    Rect(0, 0, 100, 100),
    Chunk.from([
      [0, Point(10, 10)],
      [1, Point(77, 55)],
      [2, Point(99, 99)],
      [3, Point(55, 59)]
    ])
  ]
)

const qt2 = Point2.randomPoints(10, Point2(0, 0), Point2(100, 100))
  .map(a => a.toCollection)
  .map(a => Chunk.from(a).mapWithIndex((i, p) => [i, p] as [number, Point]))
  .map(pointEntities =>
    pipe(
      [
        Rect(0, 0, 100, 100),
        Chunk.from<[number, Point]>([
          [0, Point(25, 25)],
          [1, Point(75, 25)],
          [2, Point(25, 75)],
          [2, Point(75, 75)]
        ])
      ] as const,
      QT.fromList(1),
      QT.queryBuilder<number>(),
      query => query(Rect(0, 0, 50, 50)).toArray.map(i => pointEntities.unsafeGet(i))
    )
  )
  .tap(_ => Effect.log(`finished ${JSON.stringify(_)}`))
  .provideLayer(Logger.consoleLoggerLayer)
  .unsafeRunSync()
// console.dir(QT.height(qt))

// console.log(QT.show(Show.number)(qt))

const MyQueue = EventQueue<number>()
const printQueueSize = Effect.serviceWithEffect(
  MyQueue,
  queue => queue.size.tap(size => Effect.log(`Queue has ${size}`))
).delay((5).seconds).forever
const processQueue = Effect.serviceWithEffect(
  EventQueue<number>(),
  queue => queue.takeAll.tap(nums => Effect.forEach(nums, n => Effect.log(`message #is ${n}`).delay((1).seconds)))
).delay((500).millis).forever

const addToQueue = Effect.serviceWithEffect(
  MyQueue,
  queue => Effect.clock.flatMap(clock => clock.currentTime.flatMap(time => queue.offer(time)))
).delay((1).seconds).forever

export async function initStream() {
  return Effect.collectPar(
    [printQueueSize, addToQueue, processQueue],
    identity
  )
    .provideLayer(Queue.bounded<number>(10).toLayer(MyQueue))
    .provideLayer(Logger.consoleLoggerLayer)
    .unsafeRunPromise()
  // const CountTag = Service.Tag<Ref<number>>()
  // const PairCount = Service.Tag<Ref<[number, number]>>()
  // Stream.fromEffect(
  //   Effect.service(PairCount)
  //     .flatMap((env) => env.getAndUpdate(([a, b]) => [b, a + b]))
  // ).forever
  //   .take(35)
  //   .runLast
  //   .map(_ => _.getOrElse(() => [0, 0] as const))
  //   .map(([a, b]) => a + b)
  //   .timed
  //   .tap(([d, value]) => Effect.log(`fib(25) = ${value} duration ${d.millis}ms`))
  //   .provideSomeLayer(Logger.consoleLoggerLayer)
  //   .provideLayer(Layer.fromEffect(PairCount)(Ref.make([0, 1])))
  //   .orDie
  //   .unsafeRunPromise()
}
// initStream()
