import { DurationInternal } from '@tsplus/stdlib/data/Duration'
import { Canvas } from 'effect-canvas/Canvas'
import { Point } from 'effect-canvas/Shapes'

const globalScaleVector = Point(40, 40)
const maxPoint = Point(25, 15)
const tickDuration = (100).millis
const tickInterval = Schedule.fixed(tickDuration)
export namespace SnakeGame {
  export interface Snake {
    size: number
    velocity: Point
    body: Point[]
  }
  export interface Apple extends Point {}
  type Direction = 'L' | 'R' | 'U' | 'D' | 'P'
  const makeSnake = (body: Point[], velocity: Point): Snake => ({
    size: body.length,
    body,
    velocity
  })
  export const SnakeState = Service.Tag<Ref<Snake>>()
  const KeyMap: Record<string, Direction> = {
    arrowup: 'U',
    arrowdown: 'D',
    arrowleft: 'L',
    arrowright: 'R',
    p: 'P',
    ' ': 'P',
    r: 'R'
  }
  export const Apple = Service.Tag<Ref<Apple>>()
  const LastTick = Service.Tag<Ref<number>>()
  export const tickSnake2 = (max: Point) =>
    (snake: Snake, eats: boolean, delta: Duration) => {
      const deciSeconds = Math.round(delta.millis / tickDuration.millis)
      const scaleVector = applyVelocity(snake.velocity, deciSeconds, max)
      const isStopped = snake.velocity == Point(0, 0)
      const points = pipe(
        Chunk.from(snake.body),
        ps => (isStopped ? ps : ps.prepend(scaleVector(ps.unsafeHead))),
        ps => (eats || isStopped ? ps : ps.dropRight(1))
      ).toArray
      return makeSnake(points, snake.velocity)
    }

  const applyVelocity = (v: Point, delta: number, max: Point) => {
    return pipe(
      v.scale(Point(delta, delta)),
      (b: Point) => (other: Point) => other.plus(b).plus(max).modulo(max)
    )
  }

  const directionToVelocity = (direction: Direction, current: Point): Point => {
    const v1 = getDirection()
    return current == Point(0, 0) || v1 == Point(0, 0) || current.cross(v1) != 0
      ? v1
      : current
    function getDirection() {
      switch (direction) {
        case 'L':
          return Point(-1, 0)
        case 'R':
          return Point(1, 0)
        case 'U':
          return Point(0, -1)
        case 'D':
          return Point(0, 1)
        default:
          return Point(0, 0)
      }
    }
  }

  const randomApple = pipe(maxPoint, max =>
    Effect.randomWith(rnd =>
      rnd
        .nextIntBetween(0, max.x)
        .zip(rnd.nextIntBetween(0, max.y))
        .map(([x, y]) => Point(x, y))
    ))
  const initialState = () => makeSnake([Point(15, 7)], Point(0, 0))
  const itEats = Effect.serviceWithEffect(Apple, ref => ref.get)
    .zip(Effect.serviceWithEffect(SnakeState, _ => _.get))
    .map(([apple, snake]) => apple.equals(snake.body[0]!))

  export const addApple = Effect.ifEffect(
    itEats,
    randomApple
      .flatMap(_ => Effect.serviceWithEffect(Apple, ref => ref.set(_).as(_)))
      .tap(_ => pushEvent(AppleAdded({ apple: _ })))
      .as(true),
    Effect.succeed(false)
  )

  export const restartGame = Effect.serviceWithEffect(SnakeState, _ => _.set(initialState()))

  export const gameOver = Effect.serviceWithEffect(
    SnakeState,
    _ => _.update(snake => makeSnake(snake.body, Point(0, 0)))
  )
  const itDies = (head: Point, tail: Point[]) => Chunk.from(tail).elem(Point.Equivalence, head)

  const tickSnake_ = SnakeGame.tickSnake2(maxPoint)

  export const snakeStream = Effect.unit
    .zipRight(Effect.clockWith(clock => clock.currentTime))
    .zip(Effect.service(LastTick))
    .flatMap(([now, ref]) => ref.getAndSet(now).map(_ => now - _))
    .zip(
      Effect.serviceWithEffect(SnakeState, ref => ref.get).map(
        _ => [_, itDies(_.body[0]!, _.body.slice(1))] as const
      )
    )
    .zipFlatten(addApple)
    .flatMap(([delta, [snake, isDead], snakeEats]) =>
      Effect.succeed(tickSnake_(snake, snakeEats, new DurationInternal(delta)))
        .tap(snake =>
          isDead
            ? gameOver
            : Effect.serviceWithEffect(SnakeState, _ => _.set(snake).zip(_.get))
        )
        .zip(Effect.serviceWithEffect(Apple, ref => ref.get))
        .zipFlatten(Effect.succeed(snakeEats))
        .zipFlatten(Effect.succeed(isDead))
    )

  const moveSnake = (snake: Snake, direction: Direction) => {
    return makeSnake(
      snake.body,
      directionToVelocity(direction, snake.velocity)
    )
  }

  export const showSnake = (snake: Snake) =>
    [
      snake.body.length.toFixed(0),
      snake.body[0]!.round.show,
      snake.velocity.show
    ].join('||')

  const keyStream = Stream.async<never, never, KeyboardEvent>(emit => {
    document.addEventListener('keydown', event => emit(Effect.succeed(Chunk.single(event))))
  })

  export const inputStream = keyStream
    .filter(
      event => event.key.toLowerCase() in KeyMap && !(event.metaKey || event.ctrlKey)
    )
    .mapEffect(event => Effect.sync(() => event.preventDefault()).as(event))
    .map(_ => [KeyMap[_.key.toLowerCase()] as Direction, _] as const)
    .mapEffect(([direction, event]) =>
      event.key.toLowerCase() == 'r'
        ? restartGame
        : Effect.serviceWithEffect(SnakeState, snake =>
          snake
            .update(s0 => moveSnake(s0, direction))
            .zipLeft(
              snake.get.tap(_ => pushEvent(MoveEvent({ direction: _.velocity })))
            )).as(null)
    )
    .debounce(tickDuration)

  export const gameLayer = Layer.fromEffect(LastTick)(
    Effect.clockWith(clock => clock.currentTime.flatMap(now => Ref.make(() => now)))
  ) +
    Layer.fromEffect(SnakeState)(Ref.make(initialState())) +
    Layer.fromEffect(Apple)(randomApple.flatMap(_ => Ref.make(_)))
}

namespace SnakeCanvas {
  type Apple = SnakeGame.Apple
  interface ViewModel {
    head: Point
    tail: Point[]
    eats: boolean
    apple: Point
  }

  export const paintDebug = (head: Point, len: number) =>
    Canvas.setFillStyle('black') >
      Canvas.setFont('bold 1.25rem sans') >
      Canvas.fillText(`${head.show} - ${len}`, 0, 25) >
      Canvas.fill()

  export const paintApple = (p: Apple) =>
    pipe(p.scale(globalScaleVector), (apple: Apple) =>
      Canvas.withContext(
        Canvas.setFillStyle('red') >
          Canvas.fillRect(
            apple.x,
            apple.y,
            globalScaleVector.x,
            globalScaleVector.y
          )
      ))

  export const paintSnake = (head: Point, tail: Point[]) =>
    Canvas.withContext(
      Canvas.withContext(
        Canvas.setFillStyle('lightblue') >
          Effect.forEach(tail, p =>
            pipe(p.scale(globalScaleVector), ({ x, y }) =>
              Canvas.fillRect(x, y, globalScaleVector.x, globalScaleVector.y))) >
          Canvas.fill()
      ) >
        Canvas.withContext(
          Canvas.setFillStyle('blue') >
            Canvas.fillRect(
              head.x,
              head.y,
              globalScaleVector.x,
              globalScaleVector.y
            ) >
            Canvas.fill()
        )
    )

  const fillScreen = Canvas.fillRect(0, 0, 1024, 600)
    > Canvas.fill()

  const globalScale2X = globalScaleVector.scale(Point(2, 2))
  const showScore = (score: number) =>
    Canvas.withContext(
      Canvas.translate(
        (maxPoint.x * globalScaleVector.x) / 2,
        (maxPoint.y * globalScaleVector.y) / 2
      ) >
        Canvas.setFillStyle('orange') >
        Canvas.withContext(
          Canvas.translate(globalScaleVector.x * -1, globalScaleVector.y * -1) >
            Canvas.fillRect(
              0,
              0,
              globalScale2X.x,
              globalScale2X.y
            )
        )
        > Canvas.fill()
        > Canvas.scale(2, 2)
        > Canvas.setFillStyle('black')
        > Canvas.fillText(score.toFixed(0), -8, 8)
        > Canvas.fill()
    )

  export const draw = (snake: SnakeGame.Snake, apple: Point, eats: boolean, dead: boolean) =>
    pipe(
      ViewMapper(snake, apple, eats),
      ({ apple, head, tail }) =>
        Canvas.withContext(
          Canvas.setFillStyle(
            eats ? 'rgba(0, 255, 0, 0.2)' : dead ? 'rgba(255, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.2)'
          )
            > fillScreen
        ) > showScore(snake.body.length)
          > SnakeCanvas.paintSnake(head, [head, ...tail]) >
          SnakeCanvas.paintDebug(head, tail.length) >
          SnakeCanvas.paintApple(apple)
    )

  const ViewMapper = (
    snake: SnakeGame.Snake,
    apple: Apple,
    eats: boolean
  ) => {
    return <ViewModel> {
      eats,
      head: snake.body[0]!.scale(globalScaleVector).round,
      tail: snake.body.slice(1),
      apple
    }
  }
}

type GameState = 'Playing' | 'Paused' | 'Over'
interface MoveEvent extends Case {
  _tag: 'Move'
  direction: Point
}
interface AppleAdded extends Case {
  _tag: 'AppleAdded'
  apple: Point
}
const MoveEvent = Case.tagged<MoveEvent>('Move')
const AppleAdded = Case.tagged<AppleAdded>('AppleAdded')
type GameEvent = MoveEvent | AppleAdded
interface EventQueue extends Queue<GameEvent> {}
const EventQueue = Service.Tag<EventQueue>()
const getEvent = (Effect.log(`getting events: `) > Effect.serviceWithEffect(
  EventQueue,
  _ =>
    _.size.tap(queueSize => Effect.log(`processing ${queueSize} elements`))
      > _.takeAll.flatMap(_ => Effect.forEach(_.toCollection, event => Effect.log(JSON.stringify(event))))
))
  .repeat(Schedule.fixed((5).seconds))
const pushEvent = (event: GameEvent) =>
  Effect.log(`Pushing event: ${JSON.stringify(event)}`)
    > Effect.serviceWithEffect(
      EventQueue,
      _ => _.offer(event)
    )

const GameState = Service.Tag<Ref<GameState>>()
const loop = Effect.forEachPar(
  [
    SnakeGame.addApple,
    SnakeGame.snakeStream
      .tap(args => SnakeCanvas.draw(...args))
      .repeat(tickInterval),
    SnakeGame.inputStream.runDrain,
    getEvent
  ],
  identity
)
export const game = () =>
  (loop)
    .as(void null)
    .provideSomeLayer(SnakeGame.gameLayer)
    .provideSomeLayer(
      Layer.fromEffect(EventQueue)(
        Queue.sliding(1)
      )
    )
