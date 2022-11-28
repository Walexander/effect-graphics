export type UIO<A> = Effect<never, never, A>
export type Render<E, A> = Effect<CanvasRenderingContext2D, E, A>
export interface Point {
  x: number
  y: number
}
export interface Rectangle extends Point {
  width: number
  height: number
}
export declare namespace Canvas {
  export type Tag = Canvas['Tag']
}
/** @tsplus type Canvas */
export interface Canvas {
  Tag: Service.Tag<CanvasRenderingContext2D>
}
/** @tsplus type Canvas/Aspects */
export interface CanvasAspects {}

/** @tsplus type Canvas/Ops */
export interface CanvasOps extends Canvas {
  $: CanvasAspects
}
export const Canvas: CanvasOps = {
  Tag: Service.Tag<CanvasRenderingContext2D>(),
  $: {}
}

/** @tsplus static Canvas/Ops moveTo */
export function moveTo(point: Point): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.succeed(ctx.moveTo(point.x, point.y)))
}
/** @tsplus static Canvas/Ops lineTo */
export function lineTo(point: Point): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.succeed(ctx.lineTo(point.x, point.y)))
}

/** @tsplus static Canvas/Ops stroke */
export function stroke(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.succeed(ctx.stroke()))
}

/** @tsplus static Canvas/Ops closePath */
export function closePath(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.succeed(ctx.closePath()))
}
export interface Arc {
  x: number
  y: number
  radius: number
  start: number
  end: number
  counterclockwise: boolean
}
/** @tsplus static Canvas/Ops fill */
export function fill(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.succeed(ctx.fill()))
}
/** @tsplus static Canvas/Ops save */
export function save(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.succeed(ctx.save()))
}
/** @tsplus static Canvas/Ops restore */
export function restore(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.succeed(ctx.restore()))
}
/** @tsplus static Canvas/Ops scale */
export function scale(x: number, y: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.succeed(ctx.scale(x, y)))
}
/** @tsplus static Canvas/Ops rotate */
export function rotate(angle: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.succeed(ctx.rotate(angle)))
}
/** @tsplus static Canvas/Ops translate */
export function translate(x: number, y: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.succeed(ctx.translate(x, y)))
}
/** @tsplus static Canvas/Ops fillRect */
export function fillRect({ height, width, x, y }: Rectangle): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => {
    return Effect.succeed(ctx.fillRect(x, y, width, height))
  })
}
/** @tsplus static Canvas/Ops withContext */
export function withContext<A>(effect: Render<never, A>): Render<never, A> {
  return save() > effect < restore()
}
/** @tsplus static Canvas/Ops dimensions */
export function getDimensions(): Render<never, { width: number; height: number }> {
  return Effect.service(Canvas.Tag).flatMap((ctx) => Effect.sync(ctx.canvas.getBoundingClientRect()))
}

/** @tsplus static Canvas/Ops setStrokeStyle */
export function setStrokeStyle(style: string): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => {
    ctx.strokeStyle = style
    return Effect.unit
  })
}
/** @tsplus static Canvas/Ops setLineWidth */
export function setLineWidth(width: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => {
    ctx.lineWidth = width
    return Effect.unit
  })
}
/** @tsplus static Canvas/Ops setFillStyle */
export function setFillStyle(style: string): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => {
    ctx.fillStyle = style
    return Effect.unit
  })
}
/** @tsplus static Canvas/Ops beginPath */
export function beginPath(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx =>
    Effect.succeed(
      ctx.beginPath()
    )
  )
}
/** @tsplus static Canvas/Ops fillText */
export function fillText(text: string, { x, y }: Point, maxWidth?: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap((ctx) => Effect.sync(() => ctx.fillText(text, x, y, maxWidth)))
}
/** @tsplus static Canvas/Ops setFont */
export function setFont(font: string): Render<never, void> {
  return Effect.service(Canvas.Tag).tap((ctx) => {
    ctx.font = font
    return Effect.unit
  })
}

/** @tsplus static Canvas/Ops arc */
export function arc({ counterclockwise = true, end, radius, start, x, y }: Arc): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx =>
    Effect.succeed(
      ctx.arc(x, y, radius, start, end, counterclockwise)
    )
  )
}
/** @tsplus static Canvas/Ops clearRect */
export function clearRect({ height, width, x, y }: Rectangle): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx =>
    Effect.succeed(
      ctx.clearRect(x, y, width, height)
    )
  )
}

/** @tsplus static Canvas/Ops renderTo */
export function renderTo(id: string): Effect<never, Error, CanvasRenderingContext2D> {
  return Effect.fromMaybe(Maybe.fromNullable(document.getElementById(id)))
    .mapError(() => new Error(`${id} does not exist`))
    .map((_) =>
      Either.fromPredicate(
        _,
        (a): a is HTMLCanvasElement => a instanceof HTMLCanvasElement,
        () => new Error(`${id} must be an HTML canvas element`)
      )
    )
    .flatMap((_) => Effect.fromEither(_))
    .map((_) => Maybe.fromNullable(_.getContext('2d')))
    .flatMap((_) =>
      Effect.fromMaybe(_).mapError(
        () => new Error(`cannot retrieve 2d context for ${id}`) as Error
      )
    )
}
/** @tsplus static Canvas/Ops liveLayer */
export const liveRenderLayer = (id: string) => (renderTo(id).toLayer(Canvas.Tag))

/** @tsplus static Canvas/Ops drawTo */
export const drawTo = (id: string, program: Effect<CanvasRenderingContext2D, never, void>) =>
  program
    .provideSomeLayer(Canvas.liveLayer(id))
    .provideSomeLayer(Logger.consoleLoggerLayer)
    .unsafeRunPromise()
