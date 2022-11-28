import type { Point } from 'effect-canvas/Canvas'
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

export const trees = Canvas.withContext(
  (Canvas.setLineWidth(1) >
        Canvas.translate(300, 600) >
        Canvas.scale(1.25, 1.25) >
        Canvas.setStrokeStyle('orange')) >
      binaryTree(4) &
    binaryTree(5) &
    binaryTree(6) &
    binaryTree(7)
)

const myPlant = Canvas.withContext(
  Canvas.setLineWidth(1) >
    Canvas.setStrokeStyle('hsla(68, 40%, 50%, 0.85)') >
    // Canvas.setFillStyle('hsla(68, 40%, 50%, 0.25)') >
    // Canvas.fillRect({ height, width, x: 0, y: 0 }) >
    Canvas.translate(50, 575) >
    plantCurve(6) > Canvas.stroke()
)

const kochCurveExample = Canvas.withContext(
  // Canvas.setFillStyle('hsla(0, 0%, 0%, 0.25)') >
  Canvas.setStrokeStyle('red') >
    // Canvas.fillRect({ height, width, x: 0, y: 0 }) >
    Canvas.translate(420, 250) >
    Canvas.scale(1, 1) >
    diamond(4).zipPar(snowflake(4)) >
    Canvas.stroke()
)

export const gridLines = Canvas.dimensions().flatMap(({ height, width }) =>
  Canvas.withContext(
    Canvas.clearRect({ x: 0, y: 0, width, height }) >
      Canvas.setStrokeStyle('lightgrey') >
      Canvas.setFillStyle('hsla(0, 0%, 100%, 1)') >
      Canvas.beginPath() >
      Canvas.dimensions().flatMap(({ height, width }) =>
        Canvas.fillRect({ height, width, x: 0, y: 0 }) >
          Effect.collect(
            Chunk.range(0, width / 10).map(_ => _ * 10),
            (_) =>
              Canvas.withContext(
                Canvas.setStrokeStyle(_ % 100 == 0 ? 'darkgrey' : 'lightgrey') >
                  gridLine({ x: _, y: 0 }, { x: _, y: height })
              )
          ) >
          Effect.collect(
            Chunk.range(0, height / 10).map(_ => _ * 10),
            (_) =>
              Canvas.withContext(
                Canvas.setStrokeStyle(_ % 100 == 0 ? 'darkgrey' : 'lightgrey') >
                  gridLine({ x: 0, y: _ }, { x: width, y: _ })
              )
          )
      )
        .orDie
        .unit
  )
)

export const gridLine = (from: Point, to: Point) =>
  Canvas.withContext(
    Canvas.beginPath() >
      Canvas.moveTo(from) > Canvas.lineTo(to) > Canvas.stroke()
  )

const draw = (program: Effect<CanvasRenderingContext2D, never, void>) =>
  program
    .provideSomeLayer(Canvas.liveLayer('canvas1'))
    .provideSomeLayer(Logger.consoleLoggerLayer)
    .unsafeRunPromise()

export function init() {
  Canvas.drawTo('canvas1', gridLines)
  document.getElementById('koch-snowflake')?.addEventListener('click', () => draw(kochCurveExample))
  document.getElementById('btree')?.addEventListener('click', () => draw(trees))
  document.getElementById('triangle')?.addEventListener(
    'click',
    () => draw(myPlant)
  )
  // document.getElementById('cross')?.addEventListener('click', () => draw(cross))
  // document.getElementById('circle')?.addEventListener('click', () =>
  //   draw(
  //     circle > Canvas.stroke()
  //       > Canvas.save() > Canvas.setFillStyle('#ffffff') > Canvas.fill() > Canvas.restore()
  //   ))
  document.getElementById('clear')?.addEventListener('click', () => draw(gridLines))
  document.getElementById('all')?.addEventListener(
    'click',
    () => Canvas.drawTo('canvas1', (gridLines > kochCurveExample > trees > myPlant) / Canvas.withContext)
  )
}
