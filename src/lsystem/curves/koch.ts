import { getLiveLayer, Turtle2D } from '../../Turtle2D'
import type { Interpreter, Productions } from '../definition'
import { lsystem } from '../definition'

type Letter = 'F' | 'L' | 'R'
type Sentence = Array<Letter>
const initial: Sentence = 'FLLFLLF'.split('') as Sentence
const producer: Productions<Letter> = (letter: Letter): Sentence => {
  switch (letter) {
    case ('L'):
      return ['L']
    case ('R'):
      return ['R']
    case ('F'):
      return ['F', 'L', 'F', 'R', 'R', 'F', 'L', 'F']
  }
}

const interpreter: Interpreter<any, Letter, CanvasRenderingContext2D | Turtle2D> = () =>
  (letter) =>
    Effect.service(Turtle2D).flatMap(turtle => {
      switch (letter) {
        case 'F':
          return turtle.drawForward(1.5)
        case 'L':
          return turtle.turn(-60)
        case 'R':
          return turtle.turn(60)
      }
    })
export const diamond = (iterations: number) =>
  lsystem(initial, producer, interpreter, iterations, void null).provideSomeLayer(
    getLiveLayer({ x: 0, y: 0, theta: Math.PI })
  )
const initialSnowflake = 'FRRFRRFRR'.split('') as Sentence
export const snowflake = (iterations: number) =>
  lsystem(initialSnowflake, producer, interpreter, iterations, void null).provideSomeLayer(
    getLiveLayer({ x: 0, y: 0, theta: Math.PI })
  )