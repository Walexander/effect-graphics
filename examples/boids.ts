import type { Render } from 'effect-canvas/Canvas'
import { Canvas } from 'effect-canvas/Canvas'
import * as QT from 'effect-canvas/QuadTree'
import type { GameTime } from 'effect-canvas/services/Dom'
import { domLive } from 'effect-canvas/services/Dom'
import type { Engine } from 'effect-canvas/services/Engine'
import { engineLive } from 'effect-canvas/services/Engine'
import { Arc, Composite, Ellipse, Path, Point, Rect } from 'effect-canvas/Shapes'
import { Angle } from 'effect-canvas/Units'

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
const edgeBox = Point(600, 400).scale(Point.fromScalar(1))
export const Config = Service.Tag<Ref<Config>>()
export const configLive = (config: Config) => Ref.make(config).toLayer(Config)
const triangle = (length: number) => Composite([Path([Point(0, length), Point(-5, 0), Point(5, 0)], true)])

export const boidLoop = (config: Config) => {
  const behavior = boidBehavior(config)
  const limiter = limitSpeed(config.speedLimit)
  const walls = avoidEdges(config.bounds)
  const wrap = identity // wrapEdges(config.bounds)
  return <T extends MovingObject>(boids: Chunk<T>, lookup: SimulationState<MovingObject>['lookup'], time: GameTime) =>
    boids.map(_ => pipe(_, behavior(boids, lookup), limiter, walls, wrap, updatePosition))

  function updatePosition<T extends MovingObject>(boid: T): T {
    return ({
      ...boid,
      velocity: boid.velocity,
      position: boid.position.plus(boid.velocity)
    })
  }
}
const wrapEdges = (bounds: Point) => {
  const margin = bounds.scale(Point(0.9, 1))
  return <T extends MovingObject>(boid: T) => ({
    ...boid,
    position: Point(
      Math.abs((boid.position.x + bounds.x) % bounds.x),
      boid.position.y
    )
  })
}
const avoidEdges = (bounds: Point) => {
  const margin = bounds.scale(Point(0.1, 0.1))
  const maxBounds = bounds.plus(margin.scale(Point(-1, -1)))
  return <T extends MovingObject>(_: T) => {
    const turnFactor = Math.max(1, _.velocity.magnitude / 10)
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

export const inFlock = (looking: MovingObject, distance: number) =>
  (candidate: MovingObject) =>
    looking.position != candidate.position
    && candidate.position.distanceTo(looking.position) <= distance

export const isVisible = (looking: MovingObject) =>
  (candidate: MovingObject) => candidate.position.minus(looking.position).dot(looking.velocity.normalize) > 0

export const flock = <T extends MovingObject>(boids: Chunk<T>, distance = 35) =>
  (member: T): Chunk<T> => boids.filter(inFlock(member, distance))

export const flockFast = <T extends MovingObject>(
  boids: Chunk<T>,
  distance: number,
  lookup: (r: Rect) => Chunk<number>
) =>
  (member: T): Chunk<T> =>
    lookup(
      Rect(member.position.x - distance / 2, member.position.y - distance / 2, distance, distance)
    ).map(i => boids.unsafeGet(i)).filter((c) => c.position != member.position)
      .take(10)
// .sort(Point.$.getOrdByDistance(member.position).contramap((b: T) => b.position))
// .take(10)

export const visible = <T extends MovingObject>(boids: Chunk<T>) =>
  (member: T): Chunk<T> => boids.filter(isVisible(member))

class RunningAverage {
  constructor(readonly sum: Point, readonly total = 1) {}
  static empty = new RunningAverage(Point.fromScalar(0), 0)
  static Associative = Associative((x: RunningAverage, y: RunningAverage) => x.combine(y))
  static AssociativeIdentity = AssociativeIdentity(
    RunningAverage.empty,
    RunningAverage.Associative.combine
  )
  get average() {
    return this.total == 0 ? Point.fromScalar(0) : this.sum.scale(Point.fromScalar(1 / this.total))
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

export const boidBehavior = <T extends MovingObject>({
  scales: {
    alignment: alignScale,
    cohesion: cohesionScale,
    separation: separateScale
  },
  ...config
}: Config) =>
  (boids: Chunk<T>, lookup: SimulationState<MovingObject>['lookup']) => {
    const findFlock = flockFast(boids, config.vision * 2, lookup)
    // const findFlock = flock(boids, config.vision)
    return (current: T) => {
      const [align, separate, sticky] = pipe(
        findFlock(current),
        herd => [
          alignment(herd)(current),
          separation(herd, config.minDistance)(current),
          cohesion(herd)(current)
        ]
      )
      return pipe({
        ...current,
        velocity: current.velocity.plus(
          align
            .scale(alignScale)
            .plus(sticky.scale(cohesionScale))
            .plus(separate.scale(separateScale))
        )
      })
    }
  }

const alignment = <T extends MovingObject>(visible: Chunk<T>) =>
  (boid: T) =>
    visible.length == 0
      ? Point(0, 0)
      : pipe(
        averagePoint(visible.map(_ => _.velocity)).average,
        a => a.minus(boid.velocity)
      )

const cohesion = <T extends MovingObject>(visible: Chunk<T>) =>
  (boid: T) =>
    visible.length == 0
      ? Point(0, 0)
      : pipe(
        averagePoint(visible.map(_ => _.position)).average,
        avgLocation => avgLocation.minus(boid.position)
        // avgLocation => boid.position - avgLocation
      )

const separation = <T extends MovingObject>(visible: Chunk<T>, distance: number) => {
  const distanceSq = (distance ** 2)
  return (boid: T) =>
    visible
      .filter(_ => boid.position.distanceToSq(_.position) <= distanceSq)
      .map(_ => boid.position.minus(_.position))
      .reduce(Point(0, 0), (prev: Point, curr: Point) => prev.plus(curr))
}

export const averagePoint = (flock: Chunk<Point>) =>
  flock.foldMap(RunningAverage.AssociativeIdentity, point => new RunningAverage(point))
const drawSummary = <T extends MovingObject>(
  config: Config,
  herd: Chunk<T>,
  _1: T
) =>
  Canvas.withContext(
    Canvas.beginPath()
      > Canvas.fillText(
        `s ${_1.position.round.show} Δs ${_1.velocity.show}° `,
        5,
        0
      )
      > Canvas.fillText(
        `Cohesion: ${cohesion(herd)(_1).scale(config.scales.cohesion).show}`,
        5,
        16 * 1
      )
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
      > Canvas.fillText(
        `Flock Size: ${herd.length} (${visible(herd)(_1).length} visible)`,
        5,
        16 * 4
      )
      > Canvas.fill()
  )

function drawVisor(radius: number) {
  const start = Angle.degrees(0)
  const end = Angle.degrees(360)
  return Canvas.withContext(
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
        triangle(10),
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
const drawFlock = <T extends MovingObject>(as: Chunk<T>) =>
  Canvas.withContext(
    Canvas.beginPath()
      > Effect.forEachWithIndex(as, (_, i) =>
        Canvas.withContext(
          drawBoid({
            ..._,
            color: i == 1
              ? 'periwinkle'
              : 'black' // `hsla(${_.velocity.angleTo(Point(0, 0)).degrees}deg, 50%, 50%, 1.0)`
          })
        ))
  )
const onChangeStream = (id: string): Stream<never, Maybe<never>, string> =>
  pipe(
    element(id),
    Stream.fromEffect,
    Stream.$.flatMap(_ =>
      Stream.sync(() => (_ as HTMLInputElement).value).concat(
        addHandlerI(_)('change', (event) => (event.target as HTMLInputElement).value)
      )
    )
  )
interface PauseEvent extends Case {
  _tag: 'Pause'
}
const PauseEvent = Case.tagged<PauseEvent>('Pause')
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
    Effect.randomWith(rand =>
      Effect.succeed(Angle.degrees(360 / count))
        .flatMap(base => rand.nextIntBetween(0, base.degrees).map(Angle.degrees).zip(Effect.succeed(base)))
        .flatMap(([offset, base]) =>
          pipe(
            Chunk.range(1, count)
              .map(n => base.times(n).plus(offset))
              .map(angle =>
                pipe(Point(angle.cos, angle.sin), velocity => ({
                  position: velocity.plus(point),
                  velocity
                }))
              ),
            newBoids =>
              Effect.forEach(newBoids, _ =>
                rand.nextRange(2, 2 + velocity).flatMap(rndVelocity =>
                  engine.publish(
                    AddEvent({
                      ..._,
                      position: _.position.plus(
                        _.velocity.scale(Point.fromScalar(rndVelocity * 10))
                      ),
                      velocity: _.velocity.scale(Point.fromScalar(rndVelocity))
                    })
                  )
                ))
          )
        )
    )
const pauseGame = (engine: Engine<SimulationEvent>) =>
  clickStream('toggle2').tap(click => engine.publish(PauseEvent({}))).runDrain

const handleClick = (engine: Engine<SimulationEvent>) =>
  clickStream('canvas4').tap(click =>
    pipe(
      //         ^------ eehhhh?
      [click.offsetX - 200, click.offsetY - 100] as const,
      ([x, y]) =>
        click.getModifierState('Shift')
          ? addInCircle(8, Point(x, y), 15)(engine)
          : click.getModifierState('Alt')
          ? engine.eventQueue.offer(
            SelectParticle({ location: Point(x, y) })
          )
          : Effect.unit
    )
  ).runDrain

function selectBoid(event: SelectParticle, boids: SimulationState<MovingObject>['boids']) {
  const distanceOrd = Ord.number.contramap(({ position }: MovingObject) => position.distanceTo(event.location))
  return pipe(
    boids.sort(distanceOrd).unsafeHead,
    a =>
      a.position.distanceTo(event.location) <= 50
        ? boids.findIndex(_ => _.position == a.position).getOrElse(-1)
        : -1
  )
}
const eventReducer = (state: SimulationState<MovingObject>) =>
  Match.tagFor<SimulationEvent>()({
    SelectParticle: event => ({
      ...state,
      selected: selectBoid(event, state.boids)
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

type SimulationEvent =
  | PauseEvent
  | AddEvent
  | UpdateScalesEvent
  | SelectParticle
type SimulationState<T extends MovingObject> = {
  boids: Chunk<T>
  config: Config
  selected: number
  lookup: (range: Rect) => Chunk<number>
}
const refreshLookup = (bounds: Rect, boids: Chunk<MovingObject>) =>
  pipe(
    [
      bounds,
      boids.mapWithIndex((i, p) => [i, p.position] as [number, Point])
    ],
    QT.queryFromList<number>(3, 5)
    // Recursive.refold(QT.Functor, QT.fromList<[bounds](3, 5), QT.queryBuilder<number>())
    // QT.fromList(3, 5),
    // QT.queryBuilder<number>()
  )

const withEngine = (config: Config, engine: Engine<SimulationEvent>) => {
  return randomBoids(16, config.bounds)
    .map(boids => (<SimulationState<MovingObject>> {
      selected: -1,
      boids,
      config,
      lookup: refreshLookup(Rect(0, 0, config.bounds.x, config.bounds.y), boids)
    }))
    .flatMap(s0 =>
      engine.renderLoop(s0, (st, events, time) =>
        Effect.succeed(
          pipe(
            events,
            Chunk.$.reduce(st, (state, event) => eventReducer(state)(event)),
            st_ =>
              st_.config.paused ? st_ : ({
                ...st_,
                boids: boidLoop(st_.config)(st_.boids, st_.lookup, time),
                lookup: refreshLookup(Rect(0, 0, config.bounds.x, config.bounds.y), st_.boids)
              })
          )
        )
          .tap(_ =>
            Canvas.withContext(
              Canvas.clearRect(0, 0, 1024, 768)
                > Canvas.translate(200, 100)
                > (Rect(0, 0, edgeBox.x, edgeBox.y).toCanvas > Canvas.stroke())
                // > gridLines
                > drawFlock(_.boids)
                > drawScales(_.config, _.boids.length)
                > (_.selected >= 0
                  ? drawBoidDetails(
                    _.config,
                    _.boids,
                    _.boids.unsafeGet(_.selected),
                    st.lookup
                  )
                  : Effect.unit)
            )
          ))
    )
}
const drawBoidDetails = (
  config: Config,
  boids: Chunk<MovingObject>,
  boid: MovingObject,
  lookup: (r: Rect) => Chunk<number>
) =>
  pipe(
    flockFast(boids, config.vision * 2, lookup)(boid),
    flock =>
      Canvas.withContext(
        Effect.forEachDiscard(
          [
            Canvas.translate(20, 400),
            Canvas.scale(1.5, 1.5),
            drawSummary(config, flock, boid)
          ],
          identity
        )
      ).zip(
        drawBoid({ ...boid, color: 'orange' }, config.vision)
          > Effect.forEachDiscard(
            flock.map(o =>
              Canvas.withContext(
                Canvas.beginPath()
                  > Canvas.moveTo(boid.position.x, boid.position.y)
                  > Canvas.lineTo(o.position.x, o.position.y)
                  > Canvas.setStrokeStyle(
                    isVisible(boid)(o) ? 'green' : 'red'
                  )
                  > Canvas.stroke()
              )
            ),
            identity
          )
      )
  )
const drawScales = (config: Config, total = 0) =>
  Canvas.withContext(
    Canvas.scale(1.25, 1.25)
      > Canvas.translate(20, 10)
      > Canvas.fillText(
        `
limit: ${config.speedLimit.show}; alignment: ${config.scales.alignment.show}
cohesion: ${config.scales.cohesion.show}
separation: ${config.scales.separation.show}
total: ${total}
`,
        5,
        0
      )
  )
const BoidEngineService = Service.Tag<Engine<SimulationEvent>>()
const liveBoidEngine = Queue.bounded<SimulationEvent>(64)
  .flatMap(q => engineLive(q))
  .toLayer(BoidEngineService)

const configChangeEngine = Effect.serviceWithEffect(BoidEngineService, engine =>
  Effect.forEachPar(
    ['alignment', 'cohesion', 'separation'] as const,
    key =>
      onChangeStream(key).tap((value) =>
        engine.publish(
          UpdateScaleEvent({
            scaleKey: key,
            scaleValue: Point.fromScalar(parseFloat(value))
          })
        )
      )
        .runDrain
  ))

export const simulationEngine = Effect.serviceWithEffect(
  BoidEngineService,
  engine =>
    withEngine(
      {
        bounds: edgeBox,
        paused: true,
        speedLimit: Point.fromScalar(5),
        vision: 40,
        minDistance: 20,
        scales: {
          alignment: Point.fromScalar(0.),
          cohesion: Point.fromScalar(0.0),
          separation: Point.fromScalar(0.0)
        }
      },
      engine
    )
      .zipPar(pauseGame(engine))
      .zipFlattenPar(handleClick(engine))
      .zipFlattenPar(configChangeEngine)
).provideSomeLayer(domLive > liveBoidEngine)
