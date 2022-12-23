import { Effect } from '@effect/core/io/Effect'
import { Logger } from '@effect/core/io/Logger'
import { Stream } from '@effect/core/stream/Stream'

void pipe(
  sieve2(Stream.range(2, 10)),
  Stream.$.tap(_ => Effect.log(`=== PRIME === ${_}`)),
  _ => _.runDrain,
  Effect.$.provideLayer(Logger.consoleLoggerLayer),
  Effect.$.unsafeRunSync
)
function sieve2(
  candidates: Stream<never, never, number>
): Stream<never, never, number> {
  return pipe(
    candidates,
    Stream.$.take(1),
    Stream.$.flatMap(prime =>
      pipe(
        prime,
        Stream.succeed,
        Stream.$.concat(pipe(
          candidates,
          Stream.$.drop(1),
          Stream.$.filter(candidate => candidate % prime != 0),
          // Stream.$.tap(nextPrime => Effect.log(`check out ${nextPrime}`)),
          sieve2
        ))
      )
    )
  )
}

function sieve(
  candidates: Stream<never, never, number>
): Stream<never, never, number> {
  return candidates.take(1)
    .flatMap(prime =>
      Stream.succeed(prime).concat(
        pipe(
          candidates
            .drop(1)
            .filter(candidate => candidate % prime != 0),
          // .tap(candidate => Effect.log(`\t ${candidate} % ${prime} = 0 ? ${candidate % prime == 0}`)),
          sieve
        )
      )
    )
  // return candidates.take(1).flatMap(currentPrime =>
  //   candidates.drop(1).tap(
  //     _ => Effect.logError(`filtering ${_} against ${currentPrime}`)).filter(_ => _ % currentPrime != 0)
  // )
}
// console.log(`here`)
// Effect.logSpan('Primes - ')(
//   Effect.log(`starting`)
//       > sieve(Stream.range(2, 10))
//         .tap(_ => Effect.log(`=== PRIME === ${_.toFixed(1)}`))
//         .runDrain
//     < Effect.log(`end`)
// ).zip(
//   Effect.logSpan('Primes2')(
//     Effect.log(`starting`)
//         > sieve2(Stream.range(2, 100))
//           .tap(_ => Effect.log(`=== PRIME === ${_.toFixed(1)}`))
//           .runDrain
//       < Effect.log(`end`)
//   )
// )
//   .provideLayer(Logger.consoleLoggerLayer)
//   .unsafeRunSyncExit()

// GameLayer(
//   {
//     frameProcessor: (s: number) => s + 1,
//     drawFrame: (n, d) => Effect.log(`[[d=${d.millis}ms]] == got ${n}`)
//   },
//   15
// ).unsafeRunSync()

// const s = Stream.range(2, 10).tap(_ => Effect.log(`candidate ${_}`))
// s.take(1)
//   .flatMap(_ => Stream.succeed(_).concat(s.drop(1) /*Stream.range(_ + 1, 4) */))
//   .tap(_ => Effect.log(`at the sink: ${_}`))
//   .runDrain.provideLayer(Logger.consoleLoggerLayer)
//   .unsafeRunSync()
//
const primes = sieve(Stream.unfold(2, _ => Maybe.some([_, _ + 1])))
primes.take(100).runCollect
  .timed
  .tap(([duration, _]) => Effect.log(`In ${duration.millis}ms: ${_.toArray.join(',')}`))
  .provideLayer(Logger.consoleLoggerLayer)
  .unsafeRunSync()
// Stream.unfold(1, (start) => Maybe.some([[start, start ** 2] as const, start + 2]))
//   .take(4)
//   .tap(([s, sq]) =>
//     Effect.log(`starting ${s}...${sq}`) >
//       Effect.forEachWithIndex(
//         Chunk.range(Math.max(1, (s - 2) ** 2 + 1), sq),
//         (n, index) =>
//           Effect.log(
//             `${s} <-= ${n}[${index}] ${n != sq && (index == 0 || (1 + index) % (s - 1) == 0) ? 'TURNING' : ''}-> ${sq}`
//           )
//       )
//   )
//   .provideLayer(Logger.consoleLoggerLayer)
//   .runDrain
//   .unsafeRunSync()

// // Stream.range(1, 6).filter(_ => _ % 2 == 1)
//   .map(_ => [_, _ ** 2 + 1] as const)
//   .tap(([start, finish]) =>
//     Effect.forEachWithIndex(
//       Chunk.range(start, finish),
//       (current, index) =>
//         current + 1 != finish && (current - start) % (start - 1) == 0 || current == finish ?
//           Effect.log(`turning left @ ${current} index = ${index}  start = ${start - 1}`) :
//           Effect.unit
//     ) > Effect.unit
//   )
//   // .mapEffect(([bound, i]) =>)
//   .runDrain
//   .provideSomeLayer(Logger.consoleLoggerLayer)
//   .unsafeRunSync()
