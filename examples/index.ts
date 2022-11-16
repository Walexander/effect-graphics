import { btree } from 'effect-canvas/algae-curve'
import { Canvas } from 'effect-canvas/Canvas'
import { koch } from 'effect-canvas/koch-curve'

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

export const clear = Canvas.clearRect({ x: 0, y: 0, width: 600, height: 600 })

export const draw = (program: Effect<CanvasRenderingContext2D, never, void>) =>
  program
    .provideLayer(Canvas.liveLayer('canvas1'))
    .provideSomeLayer(Logger.consoleLoggerLayer)
    .unsafeRunPromise()

export function init() {
  document.getElementById('koch-snowflake')?.addEventListener('click', () =>
    draw(Canvas.withContext(
      Canvas.translate(200, 300) >
        Canvas.scale(1.5, 1.5) > koch(4) > Canvas.stroke()
    )))
  document.getElementById('btree')?.addEventListener('click', () =>
    draw(
      Canvas.withContext(
        Canvas.setStrokeStyle('darkgrey') >
          Canvas.translate(300, 600) >
          Canvas.scale(1.75, 1.75) >
          btree(4)
      )
        > Canvas.withContext(
          Canvas.setStrokeStyle('orange') >
            Canvas.translate(300, 600) >
            Canvas.scale(1.5, 1.5) >
            btree(5)
        )
        > Canvas.withContext(
          Canvas.setStrokeStyle('green') >
            Canvas.translate(300, 600) >
            Canvas.scale(1.25, 1.25) >
            btree(6)
        )
        > Canvas.withContext(
          Canvas.setStrokeStyle('purple') >
            Canvas.translate(300, 600) >
            Canvas.scale(1, 1) >
            btree(7)
        )
        > Canvas.withContext(
          Canvas.setStrokeStyle('blue') >
            Canvas.translate(300, 600) >
            Canvas.scale(0.75, 0.75) >
            btree(8)
        )
    ))
  document.getElementById('triangle')?.addEventListener(
    'click',
    () => draw(triangle > Canvas.setFillStyle('#000000') > Canvas.fill())
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
