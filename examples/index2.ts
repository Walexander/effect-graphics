import { convexHull } from 'effect-canvas/algorithms'
import { Canvas } from 'effect-canvas/Canvas'
import { Point } from 'effect-canvas/Shapes'

import { gridLines } from './index'

const Arc = (x: number, y: number, radius: number, start: number, end: number, counterclockwise = false) => ({
  x,
  y,
  radius,
  start,
  end,
  counterclockwise
})

const randomCanvasPoints = (count: number) =>
  Canvas.dimensions().flatMap(({ height, width }) =>
    Point.randomPoints(
      count,
      Point(Math.round(width / 20), Math.round(height / 20)),
      Point(Math.round(width - (width / 20)), Math.round(height - (height / 20)))
    )
  )

const drawHull2 = (points: HashSet<Point>) =>
  pipe(
    convexHull(points),
    ([first, ...rest]) =>
      (
        Canvas.setFillStyle('black')
          > labeledPoint(first!)
          > Effect.forEach(points, drawAngleFrom(first!))
      )
        > drawPath(rest)
            .as([first!, ...rest])
            .orDie / Canvas.withContext
  )
const drawAngleFrom = (from: Point) => {
  return (to: Point) =>
    (Canvas.beginPath()
      > Canvas.moveTo(from)
      > Canvas.lineTo(to)
      > Canvas.setStrokeStyle(`hsla(${2 * from.angleTo(to).degrees}, 50%, ${50}%, 0.5)`)
      > Canvas.stroke()
      > labeledPoint(to)
      > Canvas.setFillStyle(
        `hsl(${from.angleTo(to).degrees * 2}, 50%, ${50}%)`
      )
      > Canvas.fill())
    / Canvas.withContext
}

// Shrunk:
// [{"x":454,"y":24},{"x":872,"y":71},{"x":811,"y":29},{"x":454,"y":24}, {"x": 900, "y": 24}]

// [{"x":425,"y":28},{"x":66,"y":38},{"x":150,"y":93},{"x":150,"y":93},{"x":73,"y":146}]

const drawPath = (path: Point[]) =>
  (
    Canvas.setLineWidth(1)
      > Canvas.beginPath()
      > Canvas.setFillStyle('black')
      > Canvas.setStrokeStyle('black')
      > Effect.forEachWithIndex(path, (point) =>
        Canvas.lineTo(point)
          > Canvas.stroke().delay((10).millis)
          > (
              Canvas.beginPath()
                > Canvas.arc(Arc(point.x, point.y, 6, 0, Math.PI * 2, false))
                > Canvas.fill()
            ) / Canvas.withContext)
      > Canvas.lineTo(path[0]!)
      > Canvas.stroke()
  ) / Canvas.withContext

const labeledPoint = (point: Point) =>
  Canvas.beginPath()
    > Canvas.arc(Arc(point.x, point.y, 4, 0, Math.PI * 2, false))

const toDegrees = (rads: number) => Math.round(rads * 180 / Math.PI)

const drawRandomPoints = (count: number) =>
  Canvas.drawTo(
    'canvas2',
    gridLines >
      randomCanvasPoints(count)
        .tap(_ => updateTextArea('points-json', JSON.stringify(_.toArray)).orDie)
        .flatMap(drawHull2)
        .tap(hull => updateTextArea('hull-json', JSON.stringify(hull)).orDie)
  )

function updateTextArea(id: string, value: string) {
  const hull = document.getElementById(id)
  return hull instanceof HTMLTextAreaElement ?
    Effect.sync(() => {
      hull.value = value
    }) :
    Effect.logWarning(`cannot find text area ${id}`).zipRight(Effect.fail(`cannot find ${id}`))
}
// aad points:
// [{"x":961,"y":21},{"x":465,"y":24},{"x":241,"y":48},{"x":523,"y":41},{"x":773,"y":32},{"x":773,"y":32},{"x":65,"y":97},{"x":51,"y":179},{"x":140,"y":363},{"x":641,"y":371},{"x":963,"y":376},{"x":974,"y":226},{"x":973,"y":141}]
//
// missing point
// [{"x":149,"y":217},{"x":116,"y":56},{"x":626,"y":254},{"x":840,"y":37},{"x":607,"y":369},{"x":879,"y":128},{"x":246,"y":30},{"x":502,"y":158},{"x":872,"y":256},{"x":742,"y":206},{"x":700,"y":340},{"x":951,"y":63},{"x":247,"y":94},{"x":176,"y":379},{"x":386,"y":73},{"x":769,"y":330},{"x":589,"y":70},{"x":537,"y":306},{"x":460,"y":296},{"x":657,"y":117},{"x":87,"y":178},{"x":353,"y":132},{"x":960,"y":293},{"x":421,"y":163},{"x":774,"y":352},{"x":368,"y":368},{"x":278,"y":375},{"x":623,"y":141},{"x":477,"y":286},{"x":560,"y":371},{"x":188,"y":352},{"x":476,"y":64},{"x":533,"y":73},{"x":656,"y":172},{"x":235,"y":278},{"x":766,"y":163},{"x":903,"y":218},{"x":749,"y":336},{"x":586,"y":116},{"x":337,"y":142},{"x":772,"y":219},{"x":791,"y":232},{"x":127,"y":103},{"x":88,"y":160},{"x":104,"y":336},{"x":914,"y":202},{"x":184,"y":162},{"x":345,"y":323},{"x":152,"y":195},{"x":157,"y":166},{"x":337,"y":170},{"x":595,"y":168},{"x":965,"y":30},{"x":87,"y":259},{"x":149,"y":32},{"x":317,"y":200},{"x":737,"y":20},{"x":397,"y":219},{"x":801,"y":279},{"x":949,"y":355},{"x":885,"y":35},{"x":952,"y":110},{"x":340,"y":355},{"x":498,"y":165},{"x":439,"y":64},{"x":113,"y":224},{"x":691,"y":98},{"x":901,"y":20},{"x":500,"y":134},{"x":910,"y":348},{"x":533,"y":231},{"x":445,"y":238},{"x":748,"y":191},{"x":852,"y":263},{"x":595,"y":192}]
//
// [{"x":533,"y":217},{"x":943,"y":35},{"x":483,"y":46},{"x":650,"y":135},{"x":445,"y":307},{"x":413,"y":275},{"x":503,"y":121},{"x":562,"y":60},{"x":646,"y":168},{"x":118,"y":25},{"x":131,"y":108},{"x":596,"y":59},{"x":528,"y":312},{"x":774,"y":238},{"x":527,"y":102},{"x":116,"y":190},{"x":257,"y":75},{"x":577,"y":235},{"x":223,"y":244},{"x":606,"y":309},{"x":554,"y":270},{"x":870,"y":130},{"x":846,"y":202},{"x":229,"y":128},{"x":412,"y":345},{"x":786,"y":247},{"x":830,"y":155},{"x":94,"y":248},{"x":376,"y":254},{"x":902,"y":128},{"x":396,"y":331},{"x":373,"y":114},{"x":906,"y":365},{"x":388,"y":324},{"x":140,"y":364},{"x":595,"y":307},{"x":319,"y":254},{"x":222,"y":188},{"x":749,"y":175},{"x":813,"y":175},{"x":364,"y":271},{"x":333,"y":369},{"x":479,"y":33},{"x":886,"y":40},{"x":916,"y":171},{"x":852,"y":235},{"x":209,"y":233},{"x":413,"y":261},{"x":211,"y":107},{"x":642,"y":186},{"x":690,"y":235},{"x":918,"y":335},{"x":575,"y":326},{"x":381,"y":102},{"x":656,"y":36},{"x":629,"y":64},{"x":635,"y":334},{"x":649,"y":284},{"x":461,"y":379},{"x":488,"y":190},{"x":739,"y":245},{"x":517,"y":147},{"x":184,"y":335},{"x":831,"y":232},{"x":951,"y":32},{"x":62,"y":238},{"x":617,"y":25},{"x":366,"y":191},{"x":488,"y":121},{"x":618,"y":251},{"x":899,"y":242},{"x":228,"y":118},{"x":786,"y":352},{"x":526,"y":380},{"x":397,"y":350}]
const drawRandomPoints2 = (points: HashSet<Point>) =>
  gridLines >
    drawHull2(points).tap(_ => updateTextArea('hull-json', JSON.stringify(_)).orDie)

export const init2 = () => {
  const decoder = Derive<Decoder<Point[]>>()
  const a = Point(1, 6)
  const b = Point(5, 2)
  console.log(`(${a.x}, ${a.y} == (${b.x}, ${b.y}) = ${a == b}}`)
  console.log(`(${a.x}, ${a.y} == (${a.x}, ${a.y}) = ${a == a}}`)

  console.log(`${a.show} < ${b.show} ?(x) ${Point.OrdXY.lt(a, b)} ?(y) ${Point.OrdYX.lt(a, b)}`)
  console.log(`${a.show} * ${b.show} ?${(a * b).show}`)
  console.log(`${a.show} + ${b.show} ?${(a + b).show}`)

  document.getElementById('points')?.addEventListener('click', () => drawRandomPoints(25))
  document.getElementById('json-points')?.addEventListener('click', async () => {
    const text = document.getElementById('points-json')
    const value = text instanceof (HTMLTextAreaElement) ? text.value : ''
    await Canvas.drawTo(
      'canvas2',
      Effect.fromEither(decoder.decodeJSON(value))
        .tapError(_ => Effect.logError(`Error decoding : ${_.message}`))
        .orDie
        .map(HashSet.from)
        .flatMap(points => drawRandomPoints2(points))
    )
  })
}
