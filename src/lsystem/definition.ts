export type Productions<A> = (l: A) => A[]
export type Interpreter<S, A, R = never, E = never> = (s: S) => (a: A) => Effect<R, E, S>

export const QueueSvc = <S>() => Service.Tag<Ref<ImmutableQueue<S>>>()
export function lsystem<S, A, R = never, E = never>(
  init: A[],
  producer: Productions<A>,
  interpret: Interpreter<S, A, R, E>,
  iterations: number,
  state: S
): Effect<R, E, S> {
  return go(init, iterations)
  function go(as: A[], n: number): Effect<R, E, S> {
    return (n == 0) ?
      Effect.log(`Sentence is ${as.length})`) >
          Effect.reduce(as, state, (current: S, a: A) => interpret(current)(a)) <
        Effect.log(`finished`) :
      Effect.suspendSucceed(go(as.flatMap(producer), n - 1))
  }
}
