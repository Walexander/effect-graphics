import { Point } from 'effect-canvas/Shapes'

const tickDuration = (100).millis
const maxPoint = Point(25, 15)
export interface Gamestate {
  snake: SnakeGame.Snake
  apple: SnakeGame.Apple
  eats: boolean
  dead: boolean
}
export const Gamestate = Service.Tag<Ref<Gamestate>>()
export const getState = Effect.serviceWithEffect(Gamestate, _ => _.get)
export const getSnake = getState.map(_ => _.snake)
export const setSnake = (snake: SnakeGame.Snake) =>
  Effect.serviceWithEffect(Gamestate, _ => _.update(s => ({ ...s, snake })))
export const getApple = getState.map(_ => _.apple)
export const setApple = (apple: SnakeGame.Apple) =>
  Effect.serviceWithEffect(Gamestate, _ => _.update(s => ({ ...s, apple })))
export const itEats = getState.map(_ => _.eats)
export const isDead = getState.map(_ => _.dead)
export namespace SnakeGame {
  export interface Snake {
    size: number
    velocity: Point
    body: Point[]
  }
  export interface Apple extends Point {}
  const makeSnake = (body: Point[], velocity: Point): Snake => ({
    size: body.length,
    body,
    velocity
  })
  export const SnakeState = Service.Tag<Ref<Snake>>()
  export const Apple = Service.Tag<Ref<Apple>>()
  const LastTick = Service.Tag<Ref<number>>()
  // const tickSnake_ = tickSnake(maxPoint)

  //
  // .repeat(Schedule.fixed((2).seconds))

  export const tickSnake2 = (snake: Snake, eats: boolean, delta: Duration) => {
    // const deciSeconds = Math.round(delta.millis / 100)
    const deciSeconds = Math.round(delta.millis / tickDuration.millis)
    const scaleVector = applyVelocity(snake.velocity, deciSeconds, maxPoint)
    const isStopped = snake.velocity == Point(0, 0)
    const points = pipe(
      Chunk.from(snake.body),
      ps => (isStopped ? ps : ps.prepend(scaleVector(ps.unsafeHead))),
      ps => (eats || isStopped ? ps : ps.dropRight(1))
    ).toArray
    return makeSnake(points, snake.velocity)
  }

  // Effect.random.flatMap(r => r.nextInt.map(random => random % 10 == 0))
  const applyVelocity = (v: Point, delta: number, max: Point) => {
    return pipe(
      v.scale(Point(delta, delta)),
      (b: Point) => (other: Point) => other.plus(b).plus(max).modulo(max)
    )
  }

  const randomApple = pipe(maxPoint, max =>
    Effect.randomWith(rnd =>
      rnd
        .nextIntBetween(0, max.x)
        .zip(rnd.nextIntBetween(0, max.y))
        .map(([x, y]) => Point(x, y))
    ))

  const initialState = () => makeSnake([Point(15, 7)], Point(0, 0))
  const itEats = (apple: Point, snake: Point) => apple.equals(snake)

  export const restartGame = setSnake(initialState())
  export const gameOver = getSnake.flatMap(snake => setSnake(makeSnake(snake.body, Point(0, 0))))
  const itDies = (head: Point, tail: Point[]) => Chunk.from(tail).elem(Point.Equivalence, head)

  export const snakeStream = (state: Gamestate, delta: Duration) =>
    <Gamestate> ({
      ...state,
      eats: itEats(state.apple, state.snake.body[0]!),
      dead: itDies(state.snake.body[0]!, state.snake.body.slice(1)),
      snake: state.dead ? state.snake : tickSnake2(state.snake, state.eats, delta)
    })

  export const moveSnake = (direction: Point) =>
    (state: Gamestate) =>
      <Gamestate> ({
        ...state,
        snake: makeSnake(state.snake.body, direction)
      })

  export const gameLayer = Layer.fromEffect(LastTick)(
    Effect.clockWith(clock => clock.currentTime.flatMap(now => Ref.make(() => now)))
  ) +
    Layer.fromEffect(Gamestate)(Ref.make(() =>
      <Gamestate> ({
        eats: false,
        apple: Point(0, 0),
        snake: makeSnake([maxPoint.scale(Point(0.5, 0.5)).round], Point(0, 0))
      })
    ))
  Layer.fromEffect(SnakeState)(Ref.make(initialState())) +
    Layer.fromEffect(Apple)(randomApple.flatMap(_ => Ref.make(_)))
}
