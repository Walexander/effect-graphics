import type { Render } from 'effect-canvas/Canvas'
import { Canvas } from 'effect-canvas/Canvas'
import type { GameTime } from 'effect-canvas/services/Dom'
import { domLive } from 'effect-canvas/services/Dom'
import type { Engine } from 'effect-canvas/services/Engine'
import { engineLive } from 'effect-canvas/services/Engine'
import { Arc, Composite, Path, Point, Rect } from 'effect-canvas/Shapes'
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
export const Config = Service.Tag<Ref<Config>>()
export const configLive = (config: Config) => Ref.make(config).toLayer(Config)
const triangle = (length: number) =>
  Composite([Path([Point(0, length), Point(-length / 2, 0), Point(length / 2, 0)], true)])

export const boidLoop = (config: Config) => {
  const behavior = boidBehavior(config)
  const limiter = limitSpeed(config.speedLimit)
  const walls = avoidEdges(config.bounds)
  const wrap = identity // wrapEdges(config.bounds)
  return <T extends MovingObject>(
    boids: Array<T>,
    lookup: SimulationState<MovingObject>['lookup']
  ) => boids.map(_ => pipe(_, behavior(lookup), limiter, walls, wrap, updatePosition))
}
// const wrapEdges = (bounds: Point) => {
//   const margin = bounds.scale(Point(0.9, 1))
//   return <T extends MovingObject>(boid: T) => ({
//     ...boid,
//     position: Point(
//       Math.abs((boid.position.x + bounds.x) % bounds.x),
//       boid.position.y
//     )
//   })
// }
const avoidEdges = (bounds: Point) => {
  const margin = bounds.scale(Point(0.05, 0.15))
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

export const inFlock = (looking: Point, distance: number) =>
  (candidate: Point) =>
    looking != candidate
    && candidate.distanceTo(looking) <= distance

export const isVisible = (looking: MovingObject) =>
  (candidate: MovingObject) => candidate.position.minus(looking.position).dot(looking.velocity.normalize) > 0

export const flock = <T extends MovingObject>(boids: Array<T>, distance = 35) =>
  (member: Point): Array<T> => boids.filter(_ => inFlock(member, distance)(_.position))

export const flockFast = <T extends MovingObject>(
  boids: Array<T>,
  distance: number,
  lookup: (r: Rect) => Array<number>
) =>
  (member: T): Array<T> =>
    lookup(
      Rect(
        member.position.x - distance,
        member.position.y - distance,
        distance,
        distance
      )
    )
      .map(i => boids[i]!)
      .filter(c => c.position != member.position)
      .slice(0, 10)
// .sort(Point.$.getOrdByDistance(member.position).contramap((b: T) => b.position))
// .take(10)

export const visible = <T extends MovingObject>(boids: Array<T>) =>
  (member: T): Array<T> => boids.filter(isVisible(member))

class RunningAverage {
  constructor(readonly sum: Point, readonly total = 1) {}
  static empty = new RunningAverage(Point.fromScalar(0), 0)
  static Associative = Associative((x: RunningAverage, y: RunningAverage) => x.combine(y))
  static AssociativeIdentity = AssociativeIdentity(
    RunningAverage.empty,
    RunningAverage.Associative.combine
  )
  get average() {
    return this.total == 0
      ? Point.fromScalar(0)
      : this.sum.scale(Point.fromScalar(1 / this.total))
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
        )).map(_ => _.toArray)

export const boidBehavior = <T extends MovingObject>({
  scales: {
    alignment: alignScale,
    cohesion: cohesionScale,
    separation: separateScale
  },
  ...config
}: Config) =>
  (lookup: SimulationState<MovingObject>['lookup']) => {
    return (current: T) => {
      const [align, separate, sticky] = pipe(
        lookup(current.position),
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

const alignment = <T extends MovingObject>(visible: Array<T>) =>
  (boid: T) =>
    pipe(
      visible,
      (visible) =>
        visible.length == 0
          ? Point(0, 0)
          : pipe(averagePoint(visible.map(_ => _.velocity)).average, a => a.minus(boid.velocity))
    )

const cohesion = <T extends MovingObject>(visible: Array<T>) =>
  (boid: T) =>
    pipe(
      visible,
      (visible) =>
        visible.length == 0
          ? Point(0, 0)
          : pipe(
            averagePoint(visible.map(_ => _.position)).average,
            avgLocation => avgLocation.minus(boid.position)
          )
    )

const separation = <T extends MovingObject>(
  visible: Array<T>,
  distance: number
) => {
  const distanceSq = distance ** 2
  return (boid: T) =>
    visible
      .filter(_ => boid.position.distanceToSq(_.position) <= distanceSq)
      .map(_ => boid.position.minus(_.position))
      .reduce((prev: Point, curr: Point) => prev.plus(curr), Point(0, 0))
}

export const averagePoint = (flock: Array<Point>) =>
  AssociativeIdentity.fold(RunningAverage.AssociativeIdentity)(flock.map(p => new RunningAverage(p)))

const drawSummary = <T extends MovingObject>(
  config: Config,
  herd: Array<T>,
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
        Point(
          radius * Math.cos(start.radians),
          radius * Math.sin(start.radians)
        )
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
        triangle(20),
        // Ellipse(
        //
        //   0,
        //   0,
        //   6,
        //   6,
        //   boid.velocity.angleTo(Point.fromScalar(0)),
        //   Angle.radians(0),
        //   Angle.degrees(360),
        //   true
        // ),
        Path([
          Point(0, boid.velocity.magnitude),
          Point(0, Math.floor(boid.velocity.magnitude))
        ])
      ]).toCanvas
      > Canvas.setFillStyle(boid.color)
      > Canvas.setStrokeStyle('purple')
      > Canvas.fill()
      > Canvas.stroke()
      > Canvas.beginPath()
      > (visor ? drawVisor(visor) : Effect.unit)
      > Effect.succeed(boid)
  )
}
const drawFlock = <T extends MovingObject>(as: Array<T>) =>
  Canvas.withContext(
    Canvas.beginPath()
      > Effect.forEachWithIndex(as, (_, i) =>
        Canvas.withContext(
          drawBoid({
            ..._,
            color: i == 1 ? 'periwinkle' : 'black' // `hsla(${_.velocity.angleTo(Point(0, 0)).degrees}deg, 50%, 50%, 1.0)`
          })
        ))
  )
const onChangeStream = (id: string): Stream<never, Maybe<never>, string> =>
  pipe(
    element(id),
    Stream.fromEffect,
    Stream.$.flatMap(_ =>
      Stream.sync(() => (_ as HTMLInputElement).value).concat(
        addHandlerI(_)(
          'change',
          event => (event.target as HTMLInputElement).value
        )
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
interface UpdateVisionEvent extends Case {
  _tag: 'UpdateVision'
  visionValue: number
}
export const UpdateVisionEvent = Case.tagged<UpdateVisionEvent>('UpdateVision')
interface SelectParticle extends Case {
  _tag: 'SelectParticle'
  location: Point
}
export const SelectParticle = Case.tagged<SelectParticle>('SelectParticle')
export const addInCircle = (count: number, point: Point, velocity: number) =>
  (engine: Engine<SimulationEvent>) =>
    Effect.randomWith(rand =>
      Effect.succeed(Angle.degrees(360 / count))
        .flatMap(base =>
          rand
            .nextIntBetween(0, base.degrees)
            .map(Angle.degrees)
            .zip(Effect.succeed(base))
        )
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
  clickStream('toggle2').tap(_ => engine.publish(PauseEvent({}))).runDrain

const onVisionUpdate = (engine: Engine<SimulationEvent>) =>
  onChangeStream('vision').tap(_ => engine.publish(UpdateVisionEvent({ visionValue: parseInt(_, 10) }))).runDrain
const handleClick = (engine: Engine<SimulationEvent>) =>
  clickStream('canvas4').tap(click =>
    pipe(
      //         ^------ eehhhh?
      [click.offsetX - 0, click.offsetY - 0] as const,
      ([x, y]) =>
        click.getModifierState('Alt')
          ? engine.eventQueue.offer(SelectParticle({ location: Point(x, y) }))
          : addInCircle(8, Point(x, y), 15)(engine)
    )
  ).runDrain

function selectBoid(
  event: SelectParticle,
  boids: SimulationState<MovingObject>['boids']
) {
  const distanceOrd = Ord.number.contramap(({ position }: MovingObject) => position.distanceTo(event.location))
  return pipe(boids.sort((x, y) => distanceOrd.compare(x, y))[0]!, a =>
    a.position.distanceTo(event.location) <= 50
      ? boids.findIndex(_ => _.position == a.position)
      : -1)
}
const eventReducer = (state: SimulationState<MovingObject>): (e: SimulationEvent) => SimulationState<MovingObject> =>
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
      boids: [...state.boids, { position: event.position, velocity: event.velocity }]
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
    }),
    UpdateVision: event => ({
      ...state,
      config: {
        ...state.config,
        vision: event.visionValue
      }
    })
  })

type SimulationEvent =
  | PauseEvent
  | AddEvent
  | UpdateScalesEvent
  | UpdateVisionEvent
  | SelectParticle
type SimulationState<T extends MovingObject> = {
  boids: Array<T>
  config: Config
  selected: number
  lookup: (from: Point) => Array<T>
}
const refreshLookup2 = <T extends MovingObject>(boids: Array<T>, distance: number): SimulationState<T>['lookup'] =>
  flock(boids, distance)

// const refreshLookup = (bounds: Rect, boids: Array<MovingObject>) =>
//   pipe(
//     [bounds, Chunk.from(boids).map((p, i) => [i, p.position] as [number, Point])],
//     QT.queryFromList<number>(3, 5)
//     // Recursive.refold(QT.Functor, QT.fromList<[bounds](3, 5), QT.queryBuilder<number>())
//     // QT.fromList(3, 5),
//     // QT.queryBuilder<number>()
//   )

const withEngine = (config: Config, engine: Engine<SimulationEvent>) => {
  return randomBoids(16, config.bounds)
    .map(
      boids =>
        <SimulationState<MovingObject>> {
          selected: -1,
          boids,
          config,
          lookup: refreshLookup2(boids, config.vision)
        }
    )
    .flatMap(s0 =>
      engine.renderLoop(
        s0,
        (st: SimulationState<MovingObject>, events: Chunk<SimulationEvent>, time: GameTime) =>
          Effect.succeed(pipe(
            {
              ...st,
              lookup: refreshLookup2(st.boids, st.config.vision)
            },
            (st) => updateBoidState(st, events, time)
          ))
            .tap(_ =>
              Canvas.withContext(
                Canvas.clearRect(0, 0, config.bounds.x, config.bounds.y)
                  // > gridLines
                  > drawFlock(_.boids)
                  > drawScales(_.config, _.boids.length)
                  > (_.selected >= 0
                    ? drawBoidDetails(
                      _.config,
                      _.boids[_.selected]!,
                      _.lookup
                    )
                    : Effect.unit)
              )
            )
      )
    )
}

function updatePosition<T extends MovingObject>(boid: T): T {
  return {
    ...boid,
    position: boid.position.plus(boid.velocity)
  }
}
function updateBoidState(
  st: SimulationState<MovingObject>,
  events: Chunk<SimulationEvent>,
  time: GameTime
) {
  return pipe(
    events,
    Chunk.$.reduce(st, (state, event) => eventReducer(state)(event)),
    st_ =>
      st_.config.paused
        ? st_
        : {
          ...st_,
          boids: time.tick % 3 == 0 ? boidLoop(st_.config)(st_.boids, st_.lookup) : st_.boids.map(updatePosition)
        }
  )
}

const drawBoidDetails = (
  config: Config,
  boid: MovingObject,
  lookup: SimulationState<MovingObject>['lookup']
) =>
  pipe(
    lookup(boid.position),
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
                  > Canvas.setStrokeStyle(isVisible(boid)(o) ? 'green' : 'red')
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
ali: ${config.scales.alignment.show}
coh: ${config.scales.cohesion.show}
sep: ${config.scales.separation.show}
`,
        5,
        0
      ) > Canvas.fillText(
        `
limit: ${config.speedLimit.show}; 
total: ${total}
`,
        5,
        16
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
      onChangeStream(key).tap(value =>
        engine.publish(
          UpdateScaleEvent({
            scaleKey: key,
            scaleValue: Point.fromScalar(parseFloat(value))
          })
        )
      ).runDrain
  ))

export const simulationEngine = Canvas.resize()
  .map(({ height, width }) => Point(width, height))
  .tap(_ => Effect.log(`bounds is ${_.show}`))
  .flatMap(edgeBox =>
    Effect.serviceWithEffect(BoidEngineService, engine =>
      withEngine(
        {
          bounds: edgeBox,
          paused: true,
          speedLimit: Point.fromScalar(20),
          vision: 60,
          minDistance: 20,
          scales: {
            alignment: Point.fromScalar(0),
            cohesion: Point.fromScalar(0.0),
            separation: Point.fromScalar(0.0)
          }
        },
        engine
      )
        .zipPar(pauseGame(engine))
        .zipFlattenPar(handleClick(engine))
        .zipFlattenPar(onVisionUpdate(engine))
        .zipFlattenPar(configChangeEngine)).provideSomeLayer(domLive > liveBoidEngine)
  )
