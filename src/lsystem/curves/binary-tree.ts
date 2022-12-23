import { Canvas } from 'effect-canvas/Canvas'
import type { Interpreter, Productions } from 'effect-canvas/lsystem/definition'
import { lsystem } from 'effect-canvas/lsystem/definition'
import { Turtle2D } from 'effect-canvas/Turtle2D'

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
    Effect.service(Turtle2D.Tag).flatMap(turtle => {
      switch (letter) {
        case '0':
          return Canvas.withContext(
            Canvas.setStrokeStyle('green') >
                turtle.drawForward(2) < Canvas.stroke()
          )
        case '1':
          return Canvas.setStrokeStyle('orange') >
            turtle.drawForward(3).delay((1).millis)

        case '[':
          return turtle.push() >
            turtle.turn(45)
        case ']':
          return turtle.pop() >
            turtle.turn(-45)
      }
    })
export const binaryTree = (iterations: number) =>
  lsystem(initial, producer, turtleInterpreter, iterations, void null)
    .provideSomeLayer(
      Turtle2D.liveLayer(
        { x: 0, y: 0, theta: -Math.PI / 2 }
      )
    )
