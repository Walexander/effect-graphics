import { Point } from 'effect-canvas/Shapes'

import { addInCircle } from './boids'

interface EventQueue<E> extends Queue<E> {}

const EventQueue = <E>() => Service.Tag<EventQueue<E>>()

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
initStream()
