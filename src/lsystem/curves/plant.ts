import type { Interpreter } from 'effect-canvas/lsystem/definition'
import { lsystem } from 'effect-canvas/lsystem/definition'
import { Turtle2D } from 'effect-canvas/Turtle2D'

export type Letter = 'X' | 'F' | '+' | '-' | '[' | ']'
type Sentence = Letter[]
const initial: Sentence = ['X']

const producer = (letter: Letter): Sentence => {
  switch (letter) {
    case 'F':
      return ['F', 'F']
    case 'X':
      return 'F+[[X]-X]-F[-FX]+X'.split('') as Sentence
    default:
      return [letter]
  }
}
const plantInterpreter: Interpreter<any, Letter, Turtle2D | CanvasRenderingContext2D> = () =>
  (letter) =>
    Effect.service(Turtle2D.Tag).flatMap(turtle => {
      switch (letter) {
        case 'F':
          return turtle.drawForward(4)
        case 'X':
          return Effect.unit
        case '-':
          return turtle.turn(-25)
        case '+':
          return turtle.turn(25)
        case '[':
          return turtle.push()
        case ']':
          return turtle.pop()
      }
    })

export const plant = (iterations: number) =>
  lsystem(initial, producer, plantInterpreter, iterations, void null).provideSomeLayer(
    Turtle2D.liveLayer({ x: 0, y: 0, theta: (-30 / 180) * Math.PI })
  )
