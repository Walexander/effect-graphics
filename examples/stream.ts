initStream()
export function initStream() {
  // const stream = Stream.fromSchedule(Schedule.fixed((100).millis))
  // const s1 = Stream.range(1, 9).zip(Stream.range(1, 10))
  //   .tap(
  //     ([a, b]) => Effect.log(`${a} + ${b}`)
  //   )
  //   .map(([a, b]) => [b, a + b] as const)

  // const e = Stream.async<never, never, number>((emit) => {
  //   let c = 0
  //   document.getElementById('clear')?.addEventListener('click', () => {
  //     c = c + 1
  //     emit.single(c)
  //   })
  // })

  // const CountTag = Service.Tag<Ref<number>>()
  const PairCount = Service.Tag<Ref<[number, number]>>()
  Stream.fromEffect(
    Effect.service(PairCount)
      .flatMap((env) => env.getAndUpdate(([a, b]) => [b, a + b]))
  ).forever
    .take(35)
    .runLast
    .map(_ => _.getOrElse(() => [0, 0] as const))
    .map(([a, b]) => a + b)
    .timed
    .tap(([d, value]) => Effect.log(`fib(25) = ${value} duration ${d.millis}ms`))
    .provideSomeLayer(Logger.consoleLoggerLayer)
    .provideLayer(Layer.fromEffect(PairCount)(Ref.make([0, 1])))
    .orDie
    .unsafeRunPromise()
}
