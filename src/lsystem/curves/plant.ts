import { getLiveLayer, Turtle2D } from '../../Turtle2D'
import type { Interpreter } from '../definition'
import { lsystem } from '../definition'

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
    Effect.service(Turtle2D).flatMap(turtle => {
      switch (letter) {
        case 'F':
          return turtle.drawForward(2).delay((1).millis)
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
    getLiveLayer({ x: 0, y: 0, theta: (-30 / 180) * Math.PI })
  )
