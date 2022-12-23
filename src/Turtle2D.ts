import { Canvas } from 'effect-canvas/Canvas'

interface TurtleState {
  x: number
  y: number
  theta: number
}
type TurtleQueue = ImmutableQueue<TurtleState>

type CurrentTurtleState = Ref<TurtleState>
type QueueRef = Ref<TurtleQueue>
type Dependencies = CanvasRenderingContext2D

/** @tsplus type effect/Turtle2D */
export interface Turtle2D {
  drawForward(length: number): Effect<Dependencies, never, TurtleState>
  push(): Effect<Dependencies, never, void>
  pop(): Effect<Dependencies, never, void>
  turn(degrees: number): Effect<Dependencies, never, TurtleState>
}

/** @tsplus type effect/Turtle2DOps */
export interface Turtle2DOps {
  Tag: Service.Tag<Turtle2D>
}
export const Turtle2D: Turtle2DOps = {
  Tag: Service.Tag<Turtle2D>()
}

export class Turtle2DLive implements Turtle2D {
  static initialState: TurtleState = { x: 0, y: 0, theta: 0 }

  constructor(readonly state: CurrentTurtleState, readonly queue: QueueRef) {}

  drawForward(length: number) {
    return this.state.getAndUpdate(({ theta, x, y }) => ({
      theta,
      x: x + Math.cos(theta) * length,
      y: y + Math.sin(theta) * length
    }))
      .zip(this.state.get)
      .flatMap(([state0, state1]) =>
        (Canvas.beginPath()
          > Canvas.moveTo(state0.x, state0.y)
          > Canvas.lineTo(state1.x, state1.y)
          > Canvas.stroke())
          .as(state1)
      )
  }

  push() {
    return this.state.get.flatMap(state => this.queue.update(q => q.prepend(state)))
  }

  pop() {
    return this.queue.modifySome(
      Turtle2DLive.initialState,
      q => q.dequeue
    )
      .flatMap(_ => this.state.set(_))
  }

  turn(degrees: number) {
    return this.state.update((state) => ({
      ...state,
      theta: state.theta + (degrees / 180 * Math.PI)
    })).zipRight(this.state.get)
  }
}

/** @tsplus static effect/Turtle2DOps liveLayer */
export const getLiveTurtle2D = (initial = Turtle2DLive.initialState) =>
  Layer.fromEffect(Turtle2D.Tag)(Do(($) => {
    const queue = $(Ref.make(ImmutableQueue.empty()))
    const state = $(Ref.make(initial))
    return new Turtle2DLive(state, queue)
  })).fresh

export const liveLayer = getLiveTurtle2D()
