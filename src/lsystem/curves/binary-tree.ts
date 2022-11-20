import { Canvas } from '../../Canvas'
import { getLiveLayer, Turtle2D } from '../../Turtle2D'
import type { Interpreter, Productions } from '../definition'
import { lsystem } from '../definition'

type Letter = '0' | '1' | '[' | ']'
export const initial: Letter[] = ['0']
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
type BTreeInterpreter = Interpreter<any, Letter, CanvasRenderingContext2D | Turtle2D>
export const turtleInterpreter: BTreeInterpreter = () =>
  (letter) =>
    Effect.service(Turtle2D).flatMap(turtle => {
      switch (letter) {
        case '0':
          return Canvas.withContext(
            Canvas.setStrokeStyle('red') >
              turtle.drawForward(2)
          ).tap(_ => Effect.log('LEAF forward 2'))
        case '1':
          return turtle.drawForward(3).tap(_ => Effect.log(`Leaf forward(3)`))
        case '[':
          return turtle.push() >
            turtle.turn(45).tap(_ => Effect.log(`turning right`))
        case ']':
          return turtle.pop() >
            turtle.turn(-45)
              .tap(_ => Effect.log(`turning left`))
      }
    })
export const binaryTree = (iterations: number) =>
  lsystem(initial, producer, turtleInterpreter, iterations, void null)
    .provideSomeLayer(getLiveLayer(
      { x: 0, y: 0, theta: -Math.PI / 2 }
    ))
