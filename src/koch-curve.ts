import { Canvas } from 'effect-canvas/Canvas'

import type { Interpreter, Productions } from './lsystem'
import { lsystem } from './lsystem'

export type Letter = 'F' | 'L' | 'R'
export type Sentence = Array<Letter>

type State = {
  x: number
  y: number
  theta: number
}

const interpreter: Interpreter<State, Letter, CanvasRenderingContext2D> = ({ theta, x, y }) => {
  return go
  function go(a: Letter) {
    switch (a) {
      case 'L':
        return Effect.succeed(<State> { x, y, theta: theta - Math.PI / 3.0 })
      case 'R':
        return Effect.succeed(<State> { x, y, theta: theta + Math.PI / 3.0 })
      case 'F':
        return Canvas.moveTo({ x, y }) >
          Effect.succeed(
            <State> {
              theta,
              x: x + Math.cos(theta) * 1.5,
              y: y + Math.sin(theta) * 1.5
            }
          )
            .tap(({ x, y }) => Canvas.lineTo({ x, y }))
            .zipLeft(Canvas.stroke().delay((0).millis))
    }
  }
}
export const initial: Sentence = ['F', 'R', 'R', 'F', 'R', 'R', 'F', 'R', 'R']
const productions: Productions<Letter> = (letter: Letter): Sentence => {
  switch (letter) {
    case ('L'):
      return ['L']
    case ('R'):
      return ['R']
    case ('F'):
      return ['F', 'L', 'F', 'R', 'R', 'F', 'L', 'F']
  }
}

export const koch = (iterations: number) =>
  Effect.logSpan('koch')(
    lsystem(initial, productions, interpreter, iterations, <State> { x: 0, y: 0, theta: 0.0 })
  )
