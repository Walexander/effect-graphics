import { Canvas } from 'effect-canvas/Canvas'
import type { Point } from 'effect-canvas/Shapes'

/** @tsplus type graphics/Path */
export interface Path extends Case {
  _tag: 'Path'
  path: Chunk<Point>
  closed: boolean
}
/** @tsplus type graphics/PathAspects */
export interface PathAspects {}
/** @tsplus type graphics/PathOps */
export interface PathOps {
  $: PathAspects
}
export const Path: PathOps = {
  $: {}
}
const make = Case.tagged<Path>('Path')

/**
 * @tsplus static graphics/PathOps __call
 * @tsplus graphics/PathOps make
 */
export function fromList(path: Collection<Point>, closed = false) {
  return make({ path: Chunk.from(path), closed })
}
/**
 * @tsplus get graphics/Path AssociativeIdentity
 */
export const getPathAssociativeIdentity = Chunk.getAssociativeIdentity<Point>()

/** @tsplus getter graphics/Path toCanvas */
export function pathToCanvas(self: Path) {
  return Effect.fromMaybe(self.path.head)
    .orDie.flatMap(_ => Canvas.moveTo(_.x, _.y))
    .zip(
      Effect.fromMaybe(self.path.tail).orDie
        .flatMap(_ => Effect.forEach(_, point => Canvas.lineTo(point.x, point.y)))
    )
    .zip(self.closed ? Canvas.closePath() : Effect.unit)
}
