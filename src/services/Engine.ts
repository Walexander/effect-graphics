import type { GameTime } from 'effect-canvas/services/Dom'
import { Dom } from 'effect-canvas/services/Dom'

/** @tsplus type graphics/Engine */
export interface Engine<E> {
  eventQueue: Queue<E>
  publish(event: E): Effect<never, never, void>
  renderLoop<A, R2>(
    seed: A,
    cb: (v: A, events: Chunk<E>, time: GameTime) => Effect<R2, unknown, A>
  ): Effect<R2, unknown, void>
}
export const Engine = <E>() => Service.Tag<Engine<E>>()
export interface RenderObject<E, Model> {
  behavior: (prev: Model, input: RenderInput<E>) => RenderObject<E, Model>
  draw: <R>(model: Model) => Effect<R, never, Model>
}

export class RenderOutput<E, C> {
  constructor(readonly objects: Array<RenderObject<E, C>>) {}
}

export class Key {
  constructor(readonly value: number) {}
}

export class RenderInput<E> {
  constructor(readonly time: GameTime, readonly keys: E[]) {}
}

export class EngineLive<E> implements Engine<E> {
  constructor(readonly eventQueue: Queue<E>, readonly dom: Dom) {}

  publish(event: E) {
    return this.eventQueue.offer(event)
  }

  renderLoop<A, R>(
    seed: A,
    cb: (v: A, events: Chunk<E>, t: GameTime) => Effect<R, unknown, A>
  ) {
    return this.dom
      .renderLoop(seed, (next, _) =>
        // _.tick % 1e6 != 0
        //   ? Effect.succeed(next)
        this.eventQueue.takeAll
          .flatMap(events => cb(next, events, _)))
  }
}

export const engineLive = <E>(queue: Queue<E>) =>
  Effect.succeed(queue)
    .zip(Effect.service(Dom))
    .map(([q, dom]) => new EngineLive(q, dom))
