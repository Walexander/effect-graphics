import { Canvas } from './Canvas'
import type { Interpreter, Productions } from './lsystem'
import { lsystem } from './lsystem'

type Letter = '0' | '1' | '[' | ']'
export const initial = ['0']
export const producer: Productions<Letter> = (l) => {
  switch (l) {
    case '1':
      return ['1', '1']
    case '0':
      return ['1', '[', '0', ']', '0']
    default:
      return [l]
  }
}

type State = {
  x: number
  y: number
  theta: number
}

const RefSvc = Service.Tag<Ref<ImmutableQueue<State>>>()
export const interpreter: Interpreter<State, Letter, Ref<ImmutableQueue<State>> | CanvasRenderingContext2D> = (
  { theta, x, y }
) => {
  const multiplier = 3
  const on0 = () =>
    Canvas.withContext(
      Canvas.beginPath() >
          Canvas.setStrokeStyle('red') >
          Canvas.moveTo({ x, y })
          > Effect.succeed({ x: x + Math.cos(theta) * multiplier, y: y + Math.sin(theta) * multiplier, theta })
            .tap(({ x, y }) => Canvas.lineTo({ x, y }))
        < Canvas.stroke()
    ).delay((10).millis)

  const on1 = () =>
    Canvas.beginPath() >
      Canvas.moveTo({ x, y }) >
      Effect.succeed(
        <State> {
          theta,
          x: x + Math.cos(theta) * multiplier,
          y: y + Math.sin(theta) * multiplier
        }
      )
        .tap(({ x, y }) => Canvas.lineTo({ x, y }) > Canvas.stroke().delay((10).millis))

  const onPush = () => push({ x, y, theta }).as({ x, y, theta: theta + Math.PI / 4 })
  const onPop = () => pop(({ theta, x, y }) => ({ x, y, theta: theta - Math.PI / 4 }))

  return (l) => next(l)
  function next(letter: Letter) {
    switch (letter) {
      case '0':
        return on0()
      case '1':
        return on1()
      case '[':
        return onPush()
      case ']':
        return onPop()
    }
  }
}

const push = (value: State) =>
  Effect.service(RefSvc)
    .flatMap(_ => _.update(q => q.prepend(value)))

const pop = (f: (a: State) => State) =>
  Effect.service(RefSvc)
    .flatMap(ref =>
      ref
        .modifySome(<State> { x: 0, y: 0, theta: 0 }, q => q.dequeue)
        .map((state) => f(state))
    )
const init = '0'.split('') as Array<Letter>
export const btree = (iterations: number) =>
  lsystem(init, producer, interpreter, iterations, { x: 0, y: 0, theta: -Math.PI / 2 })
    .provideSomeLayer(Layer.fromEffect(RefSvc)(Ref.make(ImmutableQueue.empty())))
