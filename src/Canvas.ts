export type UIO<A> = Effect<never, never, A>
export type Render<E, A> = Effect<CanvasRenderingContext2D, E, A>
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
export function moveTo(x: number, y: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.moveTo(x, y)))
}
/** @tsplus static Canvas/Ops lineTo */
export function lineTo(x: number, y: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.lineTo(x, y)))
}

/** @tsplus static Canvas/Ops stroke */
export function stroke(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.stroke()))
}

/** @tsplus static Canvas/Ops closePath */
export function closePath(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.closePath()))
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
export function fill(_: boolean): Render<never, void> {
  return _ ? Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.fill())) : Effect.unit
}
/** @tsplus static Canvas/Ops save */
export function save(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.save()))
}
/** @tsplus static Canvas/Ops restore */
export function restore(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.restore()))
}
/** @tsplus static Canvas/Ops scale */
export function scale(x: number, y: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.scale(x, y)))
}
/** @tsplus static Canvas/Ops rotate */
export function rotate(angle: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.rotate(angle)))
}
/** @tsplus static Canvas/Ops translate */
export function translate(x: number, y: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.translate(x, y)))
}

/** @tsplus static Canvas/Ops fillRect */
export function fillRect(x: number, y: number, width: number, height: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => {
    return Effect.sync(() => ctx.fillRect(x, y, width, height))
  })
}
/** @tsplus static Canvas/Ops rect */
export function rect(x: number, y: number, width: number, height: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => {
    return Effect.sync(() => ctx.rect(x, y, width, height))
  })
}
/** @tsplus static Canvas/Ops ellipse */
export function ellipse(
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  startAngle: number,
  endAngle: number,
  counterclockwise = false
): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => {
    return Effect.sync(ctx.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise))
  })
}
/** @tsplus static Canvas/Ops withContext */
export function withContext<A>(effect: Render<never, A>): Render<never, A> {
  return save() > effect < restore()
}
/** @tsplus static Canvas/Ops dimensions */
export function getDimensions(): Render<never, { width: number; height: number }> {
  return Effect.service(Canvas.Tag).flatMap((ctx) => Effect.sync(() => ctx.canvas.getBoundingClientRect()))
}
/** @tsplus static Canvas/Ops resize */
export function resize(): Render<never, { width: number; height: number }> {
  return Effect.service(Canvas.Tag).flatMap((ctx) =>
    Effect.sync(() => ctx.canvas.getBoundingClientRect())
      .tap((rect) =>
        Effect.sync(() => {
          ctx.canvas.width = rect.width
          ctx.canvas.height = rect.height
        })
      )
  )
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
/** @tsplus static Canvas/Ops lineWidth */
export function getLineWidth(): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => {
    return Effect.sync(() => ctx.lineWidth)
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
    Effect.sync(
      () => ctx.beginPath()
    )
  )
}
/** @tsplus static Canvas/Ops fillText */
export function fillText(
  text: string,
  x: number,
  y: number,
  maxWidth?: number
): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.fillText(text, x, y, maxWidth)))
}
/** @tsplus static Canvas/Ops setFont */
export function setFont(font: string): Render<never, void> {
  return Effect.service(Canvas.Tag).tap((ctx) => {
    return Effect.sync(() => ctx.font = font)
  })
}

/** @tsplus static Canvas/Ops arc */
export function arc(
  x: number,
  y: number,
  radius: number,
  start: number,
  end: number,
  counterclockwise = false
): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.arc(x, y, radius, start, end, counterclockwise)))
}
/** @tsplus static Canvas/Ops clearRect */
export function clearRect(x: number, y: number, width: number, height: number): Render<never, void> {
  return Effect.service(Canvas.Tag).tap(ctx => Effect.sync(() => ctx.clearRect(x, y, width, height)))
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
