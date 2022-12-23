import type { Render } from 'effect-canvas/Canvas'
import { Canvas } from 'effect-canvas/Canvas'
import { Arc, Composite, Path, Point } from 'effect-canvas/Shapes'
import { Angle } from 'effect-canvas/Units'

export interface MovingObject {
  position: Point
  velocity: Point
}
interface Boid {
  position: Point
  color: string
  velocity: Point
}
export interface Config {
  bounds: Point
  speedLimit: Point
  minDistance: number
  vision: number
  scales: {
    cohesion: Point
    alignment: Point
    separation: Point
  }
}
export const Config = Service.Tag<Ref<Config>>()
export const configLive = (config: Config) => Ref.make(config).toLayer(Config)
const triangle = (length: number) =>
  Composite([
    Path([Point(0, length), Point(-5, 0), Point(5, 0)], true)
  ])

export const boidLoop = (config: Config) => {
  const behavior = boidBehavior(config)
  const limiter = limitSpeed(config.speedLimit)
  const walls = avoidEdges(config.bounds)
  const update = updatePosition(0.1)
  return (<T extends MovingObject>(boids: T[]) =>
    boids.map(_ =>
      pipe(
        _,
        behavior(boids),
        limiter,
        walls,
        update
      )
    ))
}
export const boidBehavior = ({
  scales: {
    alignment: alignScale,
    cohesion: cohesionScale,
    separation: separateScale
  },
  ...config
}: Config) =>
  (boids: MovingObject[]) =>
    (_: MovingObject) => {
      const [align, separate, sticky] = pipe(
        _,
        flock(boids, config.vision),
        herd => [
          alignment(visible(herd)(_))(_),
          separation(herd, config.minDistance)(_),
          cohesion(visible(herd)(_))(_)
        ]
      )
      return pipe({
        ..._,
        velocity: _.velocity.plus(
          align
            .scale(alignScale)
            .plus(sticky.scale(cohesionScale))
            .plus(separate.scale(separateScale))
        )
      })
    }
export const updatePosition = (delta: number) =>
  (boid: MovingObject): MovingObject => ({
    ...boid,
    velocity: boid.velocity.scale(Point(1.01, 1.01)),
    position: boid.position.plus(boid.velocity.scale(Point(delta, delta)))
  })

export const avoidEdges = (bounds: Point) => {
  const turnFactor = 0.5
  const margin = bounds.scale(Point(0.1, 0.1))
  const maxBounds = bounds.plus(margin.scale(Point(-1, -1)))
  return <T extends MovingObject>(_: T) => {
    let delta = Point(0, 0)
    if (_.position.x < margin.x) {
      delta = delta.plus(Point(turnFactor, 0))
    }
    if (_.position.y < margin.y) {
      delta = delta.plus(Point(0.0, turnFactor))
    }
    if (_.position.x > maxBounds.x) {
      delta = delta.plus(Point(-turnFactor, 0))
    }
    if (_.position.y > maxBounds.y) {
      delta = delta.plus(Point(-0.0, -turnFactor))
    }
    return {
      ..._,
      velocity: _.velocity.plus(delta)
    }
  }
}

export const limitSpeed = (max: Point) => {
  const min = max.scale(Point(-1, -1))
  const xclamp = Ord.number.contramap<number, Point>(_ => _.x).clamp(min, max)
  const yClamp = Ord.number.contramap<number, Point>(_ => _.y).clamp(min, max)
  return <T extends MovingObject>(_: T) => ({
    ..._,
    velocity: Point(
      xclamp(_.velocity).x,
      yClamp(_.velocity).y
    )
  })
}
export const sees = <T extends MovingObject>(looking: T, distance: number) =>
  (candidate: T) =>
    looking.position != candidate.position
    && candidate.position.distanceTo(looking.position) <= distance
    && candidate.position.minus(looking.position).dot(looking.velocity.normalize) > 0

export const inFlock = (looking: MovingObject, distance: number) =>
  (candidate: MovingObject) =>
    looking.position != candidate.position
    && candidate.position.distanceTo(looking.position) <= distance

export const isVisible = (looking: MovingObject) =>
  (candidate: MovingObject) => candidate.position.minus(looking.position).dot(looking.velocity.normalize) > 0

export const flock = <T extends MovingObject>(boids: T[], distance = 35) =>
  (member: T): T[] =>
    boids.filter(
      inFlock(member, distance)
    )

export const visible = <T extends MovingObject>(boids: T[]) => (member: T): T[] => boids.filter(isVisible(member))

class RunningAverage {
  constructor(readonly sum: number, readonly total = 1) {}
  static empty = new RunningAverage(0, 0)
  static Associative = Associative((x: RunningAverage, y: RunningAverage) => x.combine(y))
  static AssociativeIdentity = AssociativeIdentity(
    RunningAverage.empty,
    RunningAverage.Associative.combine
  )
  get average() {
    return Maybe.fromPredicate(this.total, _ => _ != 0).map(
      total => this.sum / total
    )
  }
  combine(that: RunningAverage) {
    return new RunningAverage(this.sum + that.sum, this.total + that.total)
  }
}

export const randomBoids = (total: number, bounding: Point) =>
  Effect.unfold(total, (n) =>
    n == 0 ?
      Effect.succeed(Maybe.none) :
      Effect.random.flatMap(rnd =>
        Effect.struct({
          x: rnd.nextIntBetween(0, bounding.x),
          y: rnd.nextIntBetween(0, bounding.y),
          dx: rnd.nextIntBetween(-15, 15),
          dy: rnd.nextIntBetween(-15, 15)
        })
      ).map(({ dx, dy, x, y }) =>
        Maybe.some([
          {
            position: Point(x, y),
            velocity: Point(dx, dy)
          },
          n - 1
        ])
      ))
export const alignment = <T extends MovingObject>(visible: T[]) =>
  (boid: T) =>
    visible.length == 0 ?
      Point(0, 0) :
      pipe(
        Point(
          averageX(visible.map(_ => _.velocity)).average.getOrElse(0),
          averageY(visible.map(_ => _.velocity)).average.getOrElse(0)
        ),
        (a) => a.minus(boid.velocity)
      )

export const separation = <T extends MovingObject>(visible: T[], distance: number) =>
  (boid: T) =>
    visible
      .filter(_ => boid.position.distanceTo(_.position) <= distance)
      .map(_ => boid.position.minus(_.position))
      .reduce((prev: Point, curr: Point) => prev.plus(curr), Point(0, 0))

export const cohesion = <T extends MovingObject>(visible: T[]) =>
  (boid: T) =>
    visible.length == 0 ?
      Point(0, 0) :
      pipe(
        Point(
          averageX(visible.map(_ => _.position)).average.getOrElse(0),
          averageY(visible.map(_ => _.position)).average.getOrElse(0)
        ),
        (avgLocation) => avgLocation.minus(boid.position)
      )
const averageItems = (items: number[]) =>
  pipe(
    items.map(_ => new RunningAverage(_)),
    AssociativeIdentity.fold(RunningAverage.AssociativeIdentity)
  )
export const averageX = (flock: Point[]) =>
  pipe(
    flock.map(_ => _.x),
    averageItems
  )
export const averageY = (flock: Point[]) =>
  pipe(
    flock.map(_ => _.y),
    averageItems
  )

export const drawSummary = (
  config: Config,
  herd: MovingObject[],
  _1: MovingObject,
  _2: MovingObject
) =>
  Canvas.withContext(
    Canvas.beginPath() >
      Canvas.fillText(
        `#1: ${_1.position.round.show} -- ${_1.velocity.show}° `,
        5,
        0
      ) >
      Canvas.fillText(
        `#2: ${_2.position.round.show} -- ${_2.velocity.show}° `,
        5,
        16
      ) >
      Canvas.fillText(
        `_1 disp _2 = ${Math.round(_1.position.distanceTo(_2.position))}`,
        5,
        32
      ) >
      Canvas.fillText(
        `
 _1 ∠ _2 = ${Math.round(_1.position.angle(_2.position).degrees)}°
(flock sizes = ${herd.length}) (viewable = ${visible(herd)(_1).length})
`,
        5,
        16 * 3
      ) >
      Canvas.fillText(
        ` _1.v ·_2 = "${
          Math.round(
            _2.position.minus(_1.position).dot(_1.velocity.normalize)
          )
        }";`,
        5,
        16 * 4
      ) >
      Canvas.fillText(
        `Cohesion: ${cohesion(herd)(_1).scale(config.scales.cohesion).show}`,
        5,
        16 * 5
      ) >
      Canvas.fillText(
        `Separation: ${
          separation(
            visible(herd)(_1),
            config.minDistance
          )(_1).scale(config.scales.separation).show
        }`,
        5,
        16 * 6
      ) >
      Canvas.fillText(
        `Alignment: ${alignment(visible(herd)(_1))(_1).scale(config.scales.alignment).show}`,
        5,
        16 * 7
      ) >
      Canvas.fillText(
        `limit: ${config.speedLimit.show}`,
        5,
        16 * 8
      ) >
      Canvas.fill()
  )

function drawVisor(radius: number) {
  const start = Angle.degrees(150)
  const end = Angle.degrees(30)
  return Canvas.setFillStyle(`hsla(0deg, 0%, 0%, 0.1)`) >
    Canvas.setStrokeStyle('hsla(0deg, 0%, 0%, 0.9)') >
    Arc({
      center: Point(0, 0),
      start,
      end,
      radius,
      counterclockwise: true
    }).toCanvas >
    Path([
      Point(
        radius * Math.cos(end.radians),
        radius * Math.sin(end.radians)
      ),
      Point(0, 0),
      Point(
        radius * Math.cos(start.radians),
        radius * Math.sin(start.radians)
      )
    ]).toCanvas >
    Canvas.fill() >
    Canvas.stroke()
}
export function drawBoid(boid: Boid, visor = 0): Render<never, Boid> {
  return Canvas.withContext(
    Canvas.translate(boid.position.x, boid.position.y) >
      Canvas.rotate(
        -boid.velocity.angleTo(Point.fromScalar(0)).radians
          + Math.PI
      ) >
      Canvas.withContext(
        Canvas.beginPath() >
          (visor ? drawVisor(visor) : Effect.unit)
      ) >
      Canvas.beginPath() >
      Composite([
        triangle(boid.velocity.magnitude),
        Path([
          Point(0, boid.velocity.magnitude),
          Point(0, Math.floor(boid.velocity.magnitude))
        ])
      ]).toCanvas >
      Canvas.setFillStyle(boid.color) >
      Canvas.fill() >
      Canvas.stroke() >
      Effect.succeed(boid)
  )
}
