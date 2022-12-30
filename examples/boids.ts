import type { Render } from 'effect-canvas/Canvas'
import { Canvas } from 'effect-canvas/Canvas'
import { Dom, domLive } from 'effect-canvas/services/Dom'
import type { Engine } from 'effect-canvas/services/Engine'
import { engineLive } from 'effect-canvas/services/Engine'
import { Arc, Composite, Ellipse, Path, Point, Rect } from 'effect-canvas/Shapes'
import { Angle } from 'effect-canvas/Units'

import { gridLines } from './grid-lines'
import { addHandlerI, clickStream, element } from './index2'

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
  total?: number
  paused?: boolean
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
const edgeBox = Point(1024, 600).scale(Point.fromScalar(1))
export const Config = Service.Tag<Ref<Config>>()
export const configLive = (config: Config) => Ref.make(config).toLayer(Config)
const triangle = (length: number) => Composite([Path([Point(0, length), Point(-5, 0), Point(5, 0)], true)])

export const boidLoop = (config: Config) => {
  const behavior = boidBehavior(config)
  const limiter = limitSpeed(config.speedLimit)
  const walls = avoidEdges(config.bounds)
  const update = updatePosition(0.1)

  return <T extends MovingObject>(boids: Chunk<T>) => boids.map(_ => pipe(_, behavior(boids), limiter, walls, update))

  function updatePosition<T extends MovingObject>(delta: number) {
    return (boid: T): T => ({
      ...boid,
      velocity: boid.velocity.scale(Point(1.001, 1.001)),
      position: boid.position.plus(boid.velocity.scale(Point(delta, delta)))
    })
  }
}
export const boidBehavior = <T extends MovingObject>({
  scales: {
    alignment: alignScale,
    cohesion: cohesionScale,
    separation: separateScale
  },
  ...config
}: Config) =>
  (boids: Chunk<T>) =>
    (_: T) => {
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
const avoidEdges = (bounds: Point) => {
  const margin = bounds.scale(Point(0.1, 0.1))
  const maxBounds = bounds.plus(margin.scale(Point(-1, -1)))
  return <T extends MovingObject>(_: T) => {
    const turnFactor = _.velocity.magnitude / 10
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
const limitSpeed = (max: Point) => {
  const min = max.scale(Point(-1, -1))
  const xclamp = Ord.number.contramap<number, Point>(_ => _.x).clamp(min, max)
  const yClamp = Ord.number.contramap<number, Point>(_ => _.y).clamp(min, max)
  return <T extends MovingObject>(_: T) => ({
    ..._,
    velocity: Point(xclamp(_.velocity).x, yClamp(_.velocity).y)
  })
}
const sees = <T extends MovingObject>(looking: T, distance: number) =>
  (candidate: T) =>
    inFlock(looking, distance)(candidate)
    && candidate.position.minus(looking.position).dot(looking.velocity.normalize)
      > 0

export const inFlock = (looking: MovingObject, distance: number) =>
  (candidate: MovingObject) =>
    looking.position != candidate.position
    && candidate.position.distanceTo(looking.position) <= distance

export const isVisible = (looking: MovingObject) =>
  (candidate: MovingObject) => candidate.position.minus(looking.position).dot(looking.velocity.normalize) > 0

export const flock = <T extends MovingObject>(boids: Chunk<T>, distance = 35) =>
  (member: T): Chunk<T> => boids.filter(inFlock(member, distance))

export const visible = <T extends MovingObject>(boids: Chunk<T>) =>
  (member: T): Chunk<T> => boids.filter(isVisible(member))

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

const randomBoids = (total: number, bounding: Point) =>
  Effect.unfold(total, n =>
    n == 0
      ? Effect.succeed(Maybe.none)
      : Effect.random
        .flatMap(rnd =>
          Effect.struct({
            x: rnd.nextIntBetween(0, bounding.x),
            y: rnd.nextIntBetween(0, bounding.y),
            dx: rnd.nextIntBetween(-15, 15),
            dy: rnd.nextIntBetween(-15, 15)
          })
        )
        .map(({ dx, dy, x, y }) =>
          Maybe.some([
            {
              position: Point(x, y),
              velocity: Point(dx, dy)
            },
            n - 1
          ])
        ))
const alignment = <T extends MovingObject>(visible: Chunk<T>) =>
  (boid: T) =>
    visible.length == 0
      ? Point(0, 0)
      : pipe(
        Point(
          averageX(visible.map(_ => _.velocity)).average.getOrElse(0),
          averageY(visible.map(_ => _.velocity)).average.getOrElse(0)
        ),
        a => a.minus(boid.velocity)
      )

const separation = <T extends MovingObject>(visible: Chunk<T>, distance: number) =>
  (boid: T) =>
    visible
      .filter(_ => boid.position.distanceTo(_.position) <= distance)
      .map(_ => boid.position.minus(_.position))
      .reduce(Point(0, 0), (prev: Point, curr: Point) => prev.plus(curr))

const cohesion = <T extends MovingObject>(visible: Chunk<T>) =>
  (boid: T) =>
    visible.length == 0
      ? Point(0, 0)
      : pipe(
        Point(
          averageX(visible.map(_ => _.position)).average.getOrElse(0),
          averageY(visible.map(_ => _.position)).average.getOrElse(0)
        ),
        avgLocation => avgLocation.minus(boid.position)
      )
const averageItems = (items: Chunk<number>) =>
  pipe(
    items.map(_ => new RunningAverage(_)),
    AssociativeIdentity.fold(RunningAverage.AssociativeIdentity)
  )
export const averageX = (flock: Chunk<Point>) =>
  pipe(
    flock.map(_ => _.x),
    averageItems
  )
export const averageY = (flock: Chunk<Point>) =>
  pipe(
    flock.map(_ => _.y),
    averageItems
  )

const drawSummary = <T extends MovingObject>(
  config: Config,
  herd: Chunk<T>,
  _1: T
) =>
  Canvas.withContext(
    Canvas.beginPath()
      > Canvas.fillText(`s ${_1.position.round.show} Δs ${_1.velocity.show}° `, 5, 0)
      > Canvas.fillText(`Cohesion: ${cohesion(herd)(_1).scale(config.scales.cohesion).show}`, 5, 16 * 1)
      > Canvas.fillText(
        `Separation: ${
          separation(
            visible(herd)(_1),
            config.minDistance
          )(_1).scale(config.scales.separation).show
        }`,
        5,
        16 * 2
      )
      > Canvas.fillText(
        `Alignment: ${alignment(visible(herd)(_1))(_1).scale(config.scales.alignment).show}`,
        5,
        16 * 3
      )
      > Canvas.fill()
  )
function drawVisor(radius: number) {
  const start = Angle.degrees(180)
  const end = Angle.degrees(0)
  return (
    Canvas.setFillStyle(`hsla(0deg, 0%, 0%, 0.1)`)
      > Canvas.setStrokeStyle('hsla(0deg, 0%, 0%, 0.9)')
      > Arc({
        center: Point(0, 0),
        start,
        end,
        radius,
        counterclockwise: true
      }).toCanvas
      > Path([
        Point(radius * Math.cos(end.radians), radius * Math.sin(end.radians)),
        Point(0, 0),
        Point(radius * Math.cos(start.radians), radius * Math.sin(start.radians))
      ]).toCanvas
      > Canvas.fill()
      > Canvas.stroke()
  )
}
function drawBoid(boid: Boid, visor = 0): Render<never, Boid> {
  return Canvas.withContext(
    Canvas.translate(boid.position.x, boid.position.y)
      > Canvas.rotate(
        -boid.velocity.angleTo(Point.fromScalar(0)).radians + Math.PI
      )
      > Canvas.beginPath()
      > Composite([
        triangle(boid.velocity.magnitude),
        Ellipse(
          0,
          0,
          6,
          6,
          boid.velocity.angleTo(Point.fromScalar(0)),
          Angle.radians(0),
          Angle.degrees(360),
          true
        ),
        Path([
          Point(0, boid.velocity.magnitude),
          Point(0, Math.floor(boid.velocity.magnitude))
        ])
      ]).toCanvas
      > Canvas.setFillStyle(boid.color)
      > Canvas.fill()
      > Canvas.stroke()
      > Canvas.beginPath()
      > (visor ? drawVisor(visor) : Effect.unit)
      > Effect.succeed(boid)
  )
}
const drawFlock = <T extends MovingObject>(vision: number) =>
  (as: Chunk<T>) =>
    Canvas.withContext(
      Canvas.beginPath()
        > Effect.forEachWithIndex(as, (_, i) =>
          Canvas.withContext(
            drawBoid(
              {
                ..._,
                color: i == 1
                  ? 'black'
                  : `hsla(${_.velocity.angleTo(Point(0, 0)).degrees}deg, 50%, 50%, 1.0)`
              }
            )
          ))
    )
const onChangeStream = (id: string): Stream<never, Maybe<never>, Event> =>
  pipe(
    element(id),
    Stream.fromEffect,
    Stream.$.flatMap(_ => addHandlerI(_)('change', identity))
  )
interface PauseEvent extends Case {
  _tag: 'Pause'
}
const PauseEvent = Case.tagged<PauseEvent>('Pause')
const PauseEventguard = Guard<PauseEvent>(
  (u): u is PauseEvent => typeof u == 'object' && u != null && '_tag' in u && u._tag == 'Pause'
)
interface AddEvent extends Case {
  _tag: 'Add'
  position: Point
  velocity: Point
}
const AddEvent = Case.tagged<AddEvent>('Add')
interface UpdateScalesEvent extends Case {
  _tag: 'UpdateScales'
  scaleKey: keyof Config['scales']
  scaleValue: Point
}
export const UpdateScaleEvent = Case.tagged<UpdateScalesEvent>('UpdateScales')
interface SelectParticle extends Case {
  _tag: 'SelectParticle'
  location: Point
}
export const SelectParticle = Case.tagged<SelectParticle>('SelectParticle')
export const addInCircle = (count: number, point: Point, velocity: number) =>
  (engine: Engine<SimulationEvent>) =>
    pipe(
      Chunk.range(1, count).map(n => Angle.degrees(n * (360 / count)))
        .map(angle =>
          pipe(
            Point(
              angle.cos,
              angle.sin
            ),
            (velocity) => ({
              position: velocity.plus(point),
              velocity
            })
          )
        ),
      _ =>
        Effect.forEach(
          _,
          _ =>
            Effect.randomWith(rand =>
              rand.nextRange(2, 2 + velocity).flatMap(rnd =>
                engine.publish(AddEvent({
                  ..._,
                  position: _.position.plus(_.velocity.scale(Point.fromScalar(rnd * 10))),
                  velocity: _.velocity.scale(Point.fromScalar(rnd))
                }))
              )
            )
        )
    )

type SimulationEvent = PauseEvent | AddEvent | UpdateScalesEvent | SelectParticle
type SimulationState<T extends MovingObject> = {
  boids: Chunk<T>
  config: Config
  selected: number
}
const pauseGame = (engine: Engine<SimulationEvent>) =>
  clickStream('toggle2')
    .tap(click => engine.publish(PauseEvent({}))).runDrain

const addBoid = (engine: Engine<SimulationEvent>, velocity: number) =>
  clickStream('canvas4')
    .tap(click =>
      click.getModifierState('Shift')
        ? addInCircle(7, Point(click.offsetX, click.offsetY), 10)(engine)
        : engine.eventQueue.offer(SelectParticle({ location: Point(click.offsetX, click.offsetY) }))
    )
    .runDrain
const eventReducer = (state: SimulationState<MovingObject>) =>
  Match.tagFor<SimulationEvent>()({
    SelectParticle: event => ({
      ...state,
      selected: state.selected >= 0
        ? -1
        : pipe(
          state.boids.sort(
            Ord.number.contramap<number, MovingObject>(
              ({ position }) => position.distanceTo(event.location)
            )
          ).unsafeHead,
          (a) => state.boids.findIndex(_ => _.position == a.position).getOrElse(-1)
        )
    }),
    Pause: () => ({
      ...state,
      config: { ...state.config, paused: !state.config.paused }
    }),
    Add: event => ({
      ...state,
      boids: state.boids.append({
        position: event.position,
        velocity: event.velocity
      })
    }),
    UpdateScales: event => ({
      ...state,
      config: {
        ...state.config,
        scales: {
          ...state.config.scales,
          [event.scaleKey]: event.scaleValue
        }
      }
    })
  })
const withEngine = (config: Config, engine: Engine<SimulationEvent>) => {
  return randomBoids(12, config.bounds)
    .map(boids => ({
      selected: -1,
      boids,
      config
    }))
    .flatMap(s0 =>
      engine.renderLoop(s0, (st, events) =>
        Effect.succeed({
          ...st,
          boids: st.config.paused ? st.boids : boidLoop(st.config)(st.boids)
        })
          .map((_: SimulationState<MovingObject>): SimulationState<MovingObject> =>
            events.reduce(_, (state, event) => eventReducer(state)(event))
          )
          .tap(
            _ =>
              Canvas.clearRect(0, 0, 1024, 768)
                > gridLines
                > drawFlock(_.config.vision)(_.boids)
                > drawScales(_.config)
          )
          .tap(_ =>
            _.selected >= 0
              ? drawBoidDetails(_.config, _.boids, _.boids.unsafeGet(_.selected))
              : Effect.unit
          ))
    )
}
const drawBoidDetails = (config: Config, boids: Chunk<MovingObject>, boid: MovingObject) =>
  pipe(flock(boids, config.vision)(boid), flock =>
    Canvas.withContext(
      Effect.forEachDiscard([
        Canvas.translate(20, 400),
        Canvas.scale(1.5, 1.5),
        drawSummary(
          config,
          flock,
          boid
        )
      ], identity)
    )
      .zip(
        drawBoid({ ...boid, color: 'orange' }, config.vision)
          > Effect.forEachDiscard(
            flock.map(o =>
              Canvas.withContext(
                Canvas.beginPath() > Canvas.moveTo(boid.position.x, boid.position.y)
                  > Canvas.lineTo(o.position.x, o.position.y)
                  > Canvas.setStrokeStyle(
                    sees(boid, config.vision)(o) ? 'green' : 'red'
                  ) > Canvas.stroke()
              )
            ),
            identity
          )
      ))
const drawScales = (config: Config) =>
  Canvas.withContext(
    Canvas.scale(1.25, 1.25)
      > Canvas.translate(20, 10)
      > Canvas.fillText(
        `
limit: ${config.speedLimit.show}; alignment: ${config.scales.alignment.show}
cohesion: ${config.scales.cohesion.show}
separation: ${config.scales.separation.show}
`,
        5,
        0
      )
  )
const BoidEngineService = Service.Tag<Engine<SimulationEvent>>()
const liveBoidEngine = Queue.bounded<SimulationEvent>(16)
  .flatMap(q => engineLive(q))
  .toLayer(BoidEngineService)

const configChangeEngine = Effect.serviceWithEffect(BoidEngineService, engine =>
  Effect.forEachPar(
    ['alignment', 'cohesion', 'separation'] as const,
    key =>
      onChangeStream(key)
        .tap(event =>
          Effect.sync(() => event.target as HTMLInputElement).flatMap(source =>
            engine.publish(UpdateScaleEvent({
              scaleKey: key,
              scaleValue: Point.fromScalar(parseFloat(source.value) / 100)
            }))
          )
        ).runDrain
  ))

export const simulationEngine = Effect.serviceWithEffect(
  BoidEngineService,
  engine =>
    withEngine(
      {
        bounds: edgeBox,
        paused: true,
        speedLimit: Point.fromScalar(15),
        vision: 105,
        minDistance: 15,
        scales: {
          alignment: Point.fromScalar(0.025),
          cohesion: Point.fromScalar(0.025),
          separation: Point.fromScalar(0.125)
        }
      },
      engine
    )
      .zipPar(pauseGame(engine))
      .zipFlattenPar(addBoid(engine, 10))
      .zipFlattenPar(configChangeEngine)
).provideSomeLayer(domLive > liveBoidEngine)
