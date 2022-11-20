import { Canvas } from 'effect-canvas/Canvas'
import { binaryTree, diamond, plant as plantCurve, snowflake } from 'effect-canvas/lsystem/curves'

export const triangle = Effect.logSpan('triangle')(
  Effect.log('... starting ...')
      > Canvas.beginPath()
      > Canvas.moveTo({ x: 300, y: 300 })
      > Canvas.lineTo({ x: 0, y: 600 })
      > Canvas.lineTo({ x: 200, y: 600 })
      > Canvas.lineTo({ x: 300, y: 300 })
      > Canvas.closePath()
    < Effect.log('... ending ...')
)

export const smallTriangle = Effect.logSpan('draw2')(
  Effect.log('... starting ...')
      > Canvas.beginPath()
      > Canvas.moveTo({ x: 75, y: 50 })
      > Canvas.lineTo({ x: 100, y: 75 })
      > Canvas.lineTo({ x: 100, y: 25 })
      > Canvas.closePath()
    < Effect.log('... ending ...')
)
export const circle = Effect.logSpan('drawCircle')(
  Effect.log('... starting ...')
      > Canvas.beginPath()
      > Canvas.moveTo({ x: 400, y: 300 })
      > Canvas.arc({
        x: 300,
        y: 300,
        radius: 100,
        start: 0,
        end: Math.PI,
        counterclockwise: false
      })
      > Canvas.lineTo({ x: 400, y: 300 })
      > Canvas.closePath()
    < Effect.log('... ending ...')
)
export const flippedCircle = Canvas.save() >
  Canvas.setFillStyle('#000000') >
  circle >
  Canvas.fill() >
  Canvas.restore()

const ctx = Canvas
const cross = Canvas.withContext(
  ctx.setFillStyle('gray')
    > ctx.fillRect({ x: 80, y: 60, width: 140, height: 30 })
    // Matrix transformation
    > ctx.translate(150, 75)
    > ctx.rotate(Math.PI / 2)
    > ctx.translate(-150, -75)
    // Rotated rectangle
    > ctx.setFillStyle('red')
    > ctx.fillRect({ x: 80, y: 60, width: 140, height: 30 })
)

export const trees = Canvas.setLineWidth(2) >
  Canvas.setFillStyle('black') >
  Canvas.fillRect({ height: 600, width: 600, x: 0, y: 0 }) >
  Canvas.withContext(
    Canvas.setStrokeStyle('white') >
      Canvas.translate(300, 600) >
      Canvas.scale(0.75, 0.75) >
      binaryTree(8)
  )
  > Canvas.withContext(
    Canvas.setStrokeStyle('orange') >
      Canvas.translate(300, 600) >
      Canvas.scale(1.5, 1.5) >
      binaryTree(5)
  )
// > Canvas.withContext(
//   Canvas.setStrokeStyle('green') >
//     Canvas.translate(300, 600) >
//     Canvas.scale(1.25, 1.25) >
//     btree(6)
// )
// > Canvas.withContext(
//   Canvas.setStrokeStyle('purple') >
//     Canvas.translate(300, 600) >
//     Canvas.scale(1, 1) >
//     btree(7)
// )
// > Canvas.withContext(
//   Canvas.setStrokeStyle('blue') >
//     Canvas.translate(300, 600) >
//     Canvas.scale(0.75, 0.75) >
//     btree(8)
// )

const clear = Canvas.clearRect({ x: 0, y: 0, width: 600, height: 600 })
const myPlant = Canvas.withContext(
  Canvas.setLineWidth(1) >
    Canvas.setFillStyle('#f5f6eb') >
    Canvas.setStrokeStyle('hsla(68, 40%, 50%, 0.5)') >
    Canvas.fillRect({ height: 600, width: 600, x: 0, y: 0 }) >
    Canvas.translate(50, 450) >
    Canvas.scale(2.5, 2.5) >
    plantCurve(5) > Canvas.stroke()
)
const kochCurveExample = Canvas.withContext(
  Canvas.setFillStyle('hsla(0, 0%, 0%, 0.8)') >
    Canvas.setStrokeStyle('hsla(0, 0%, 100%, 0.5)') >
    Canvas.fillRect({ height: 600, width: 600, x: 0, y: 0 }) >
    Canvas.withContext(
      Canvas.translate(400, 200) >
        Canvas.scale(0.75, 0.75) >
        diamond(5)
    ) >
    Canvas.withContext(
      Canvas.setStrokeStyle('red') >
        Canvas.translate(450, 400) >
        Canvas.scale(0.75, 0.75) >
        snowflake(5)
    ) >
    Canvas.stroke()
)

const draw = (program: Effect<CanvasRenderingContext2D, never, void>) =>
  program
    .provideSomeLayer(Canvas.liveLayer('canvas1'))
    .provideSomeLayer(Logger.consoleLoggerLayer)
    .unsafeRunPromise()

export function init() {
  document.getElementById('koch-snowflake')?.addEventListener('click', () => draw(kochCurveExample))
  document.getElementById('btree')?.addEventListener('click', () => draw(trees))
  document.getElementById('triangle')?.addEventListener(
    'click',
    () => draw(myPlant)
  )
  document.getElementById('cross')?.addEventListener('click', () => draw(cross))
  document.getElementById('circle')?.addEventListener('click', () =>
    draw(
      circle > Canvas.stroke()
        > Canvas.save() > Canvas.setFillStyle('#ffffff') > Canvas.fill() > Canvas.restore()
    ))
  document.getElementById('clear')?.addEventListener('click', () => draw(clear))
  document.getElementById('all')?.addEventListener('click', () =>
    draw(
      clear > triangle > Canvas.fill() > smallTriangle > Canvas.stroke() > cross >
        circle > Canvas.stroke()
        > Canvas.withContext(Canvas.setFillStyle('#ffffff') > Canvas.fill())
    ))
}
