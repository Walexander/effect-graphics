type F<A> = Effect<never, never, A>
/** @tsplus type graphics/Dom */
export interface Dom {
  appendToBody(canvas: HTMLCanvasElement): F<void>
  renderLoop<A, R>(
    seed: A,
    callback: (next: A, time: GameTime) => Effect<R, unknown, A>
  ): Effect<R, unknown, void>

  keydown: Stream<never, never, KeyboardEvent>
  keyup: Stream<never, never, KeyboardEvent>
}
export const Dom = Service.Tag<Dom>()
export interface GameTime {
  now: number
  elapsed: number
  tick: number
}

export class DomLive implements Dom {
  constructor(readonly dom: Document, readonly lastUpdate: Ref<readonly [number, number]>) {}

  appendToBody(canvas: HTMLCanvasElement) {
    return Effect.sync(() => this.dom.body.appendChild(canvas))
  }

  renderLoop<A, R>(
    seed: A,
    callback: (next: A, now: GameTime) => Effect<R, unknown, A>
  ) {
    const eff = animationFrameStream
      .mapEffect(now =>
        this.lastUpdate.get.map(
          ([lastUpdate, tick]) =>
            <GameTime> {
              now,
              tick,
              elapsed: now - lastUpdate
            }
        ).tap(({ tick }) => this.lastUpdate.set([now, tick + 1] as const))
      )
      .scanEffect(seed, (prev, time) => callback(prev, time))
      .runDrain
    return eff
  }

  get keyup(): Stream<never, never, KeyboardEvent> {
    return Stream.async<never, never, KeyboardEvent>(emit =>
      this.dom.addEventListener('keyup', event => emit(Effect.succeed(Chunk.single(event))))
    )
  }

  get keydown(): Stream<never, never, KeyboardEvent> {
    return Stream.async<never, never, KeyboardEvent>(emit =>
      this.dom.addEventListener('keydown', event => emit(Effect.succeed(Chunk.single(event))))
    )
  }
}
const animationFrameStream = Stream.asyncInterrupt<never, never, number>(
  emit => {
    let _cancel = false
    window.requestAnimationFrame(loop)
    return Either.left(
      Effect.sync(() => {
        _cancel = true
      })
    )
    function loop(time: number) {
      return _cancel ? void null : emit(
        Effect.sync(() => window.requestAnimationFrame(loop)).as(
          Chunk.single(time)
        )
      )
    }
  }
)

export const domLive = Ref.make(() => [0, 0] as const)
  .zip(Effect.sync(() => window.document))
  .map(([ref, dom]) => new DomLive(dom, ref))
  .toLayer(Dom)
