import type { GameTime } from 'effect-canvas/services/Dom'
import type { Rect } from 'effect-canvas/Shapes'
import type { Angle } from 'effect-canvas/Units'

type F<A> = Effect<never, never, A>
type IO<E, A> = Effect<never, E, A>

/** @tsplus type graphics/Engine */
export interface Engine<O, E, Context, View, Texture> {
  initialize(options: O): IO<E, Context>
  renderLoop(c: Context, seed: RenderOutput<Texture>, cb: (c: Context) => View): F<void>
}
export class RenderObject<Texture> {
  constructor(
    readonly aabb: Rect,
    readonly rotation: Angle,
    readonly texture: Texture,
    readonly behavior: (previous: RenderObject<Texture>, keys: Set<Key>) => RenderObject<Texture>
  ) {}
}

export class RenderOutput<Texture> {
  constructor(readonly objects: Array<RenderObject<Texture>>) {}
}

export class Key {
  constructor(readonly value: number) {}
}

export class RenderInput {
  constructor(readonly time: GameTime, readonly keys: Set<Key>) {}
}


