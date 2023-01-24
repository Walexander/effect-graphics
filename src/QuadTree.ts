import type { Unfolder } from '@tsplus/stdlib/prelude/Recursive'
import { Recursive } from '@tsplus/stdlib/prelude/Recursive'
import type { Rect } from 'effect-canvas/Shapes'
import { Point } from 'effect-canvas/Shapes'

export type QuadTree<R> = Recursive<QuadTreeF, R>
type QuadTreeBase<A, R> = Tip<A, R> | Leaf<A, R>
interface QuadTreeF extends HKT {
  readonly type: QuadTreeBase<this['A'], this['R']>
}
class Tip<A, R> {
  readonly _tag = 'Tip'
  constructor(readonly rect: Rect, readonly items: [R, Point][]) {}
  map<B>(_: (a: A) => B): Tip<B, R> {
    return this as any
  }
}
class Leaf<A, R> {
  readonly _tag = 'Leaf'
  constructor(
    readonly rect: Rect,
    readonly nw: A,
    readonly ne: A,
    readonly sw: A,
    readonly se: A
  ) {}

  map<B>(f: (a: A) => B): QuadTreeBase<B, R> {
    return new Leaf(
      this.rect,
      f(this.nw),
      f(this.ne),
      f(this.sw),
      f(this.se)
    )
  }
}
export const Functor: Covariant<QuadTreeF> = HKT.instance<Covariant<QuadTreeF>>({ map: f => fa => fa.map(f) })

export const fold = <A>(fn: Recursive.Fn<QuadTreeF, A, any, any>) => Recursive.$.fold(Functor, fn)

/**
 * Generate a function to create a QuadTree<R> with a maximum of `count` items
 * per quadrant and a minimum distance of `epsilon` between quadrants
 *
 * The returned function will unfold from a pair of `Rect, Chunk<[R, Point]>`
 * where `Rect` is the initial bounding box.  The Chunk should contain value/location pairs
 */
export function fromList<R = unknown, E = any>(count: number, epsilon = 1) {
  return Recursive.unfold(Functor, fromListCoalgebra<R, E>(count, epsilon))
}

function fromListCoalgebra<R = unknown, E = any>(count: number, epsilon = 1): Unfolder.Fn<
  QuadTreeF,
  readonly [Rect, Chunk<[R, Point]>],
  E,
  R
> {
  type C = [R, Point]
  type Args = readonly [Rect, Chunk<C>]
  const sortY = Point.OrdYX.contramap(([, point]: [any, Point]) => point)
  const sortX = Point.OrdXY.contramap(([, point]: [any, Point]) => point)

  return ([rect, rs0]) =>
    // if we are ready, make a `Tip` and stop the recursion
    ready(rs0, rect)
      ? new Tip(rect, rs0.toArray)
      : // otherwise, split the rectangle and make a new `Leaf`
        new Leaf(rect, ...splitSpace(rect, rs0))

  function ready(rs: Chunk<any>, rect: Rect) {
    return (
      rs.size <= count
      // Dont split if we are already really small
      || rect.height < epsilon
      || rect.width < epsilon
    )
  }
  function splitPoints(mid: Point, items: Chunk<C>): [Chunk<C>, Chunk<C>, Chunk<C>, Chunk<C>] {
    const xSort = (a: C) => sortX.lt([null, mid], a)
    const ySort = (a: C) => sortY.gt([null, mid], a)
    // sort into above and below, then by left and right
    return pipe(
      items,
      Chunk.$.partition(ySort),
      ([above, below]) => [
        ...Chunk.$.partition(xSort)(above),
        ...Chunk.$.partition(xSort)(below)
      ]
    )
  }

  // pair each Point to one of the four quadrants of the given rectangle
  function splitSpace(rect: Rect, items: Chunk<C>): [Args, Args, Args, Args] {
    const [ul, ur, bl, br] = rect.split
    const [nw, ne, sw, se] = splitPoints(rect.midpoint, items)
    return [
      // finally, pair each chunk of points with its
      // split rectangle location
      [ul, nw],
      [ur, ne],
      [bl, sw],
      [br, se]
    ]
  }
}

function builderAlgebra<R, E = unknown>(): Recursive.Fn<QuadTreeF, (range: Rect) => Chunk<R>, E, R> {
  return function queryQt(qt) {
    return (range: Rect) =>
      !qt.rect.overlaps(range)
        ? Chunk.empty<R>() // empty chunk when no overlap
        : qt._tag == 'Tip'
        ? /* if its a `Tip` pluck the points within our range */
          Chunk.from(qt.items).filter(([, p]) => range.contains(p)).map(([r]) => r)
        : /* if its a `Leaf`, concat the results of each child */
          qt.nw(range).concat(qt.ne(range)).concat(qt.sw(range)).concat(qt.se(range))
  }
}
/**
 * Given a `QuadTree<R>`, generate a function from `(range: Rect) => R[]`
 *
 * @example
 * import * as QT from 'effect-canvas/QuadTree'
 * declare const qt: QT.QuadTree<number>
 * const lookup = QT.queryBuilder()()
 * lookup(Rect(0, 0, 100, 100)))
 */
export function queryBuilder<R>() {
  return Recursive.$.fold(Functor, builderAlgebra<R>())
}

/**
 * Build a query function from a `Chunk<R>`
 */
export function queryFromList<R>(count: number, epsilon = 1) {
  return refold(Functor, builderAlgebra<R>(), fromListCoalgebra(count, epsilon))
}

const heightAlgebra: Recursive.Fn<QuadTreeF, number> = tree =>
  Match.tag(tree, {
    Tip: () => 1,
    Leaf: leaf => 1 + Math.max(leaf.nw, leaf.ne, leaf.sw, leaf.se)
  })
export const height = fold(heightAlgebra)
const sizeAlgebra: Recursive.Fn<QuadTreeF, number> = tree =>
  Match.tag(tree, {
    Tip: _ => _.items.length,
    Leaf: _ => [_.ne, _.nw, _.se, _.sw].reduce((a, b) => a + b, 0)
  })
export const size = fold(sizeAlgebra)

export const forEachF = ForEach.implementForEachF<QuadTreeF>()(_ =>
  G => {
    return f => {
      type R = typeof _.R
      type G = typeof _.G
      type E = typeof _.E
      type B = typeof _.B
      const succeed = DSL.succeedF(G)
      return qt => {
        return Match.tag(Functor.map(f)(qt), {
          Tip: _ => succeed<QuadTreeBase<B, R>, R, E>(new Tip<B, R>(_.rect, _.items)),
          Leaf: (_): HKT.Kind<G, R, E, QuadTreeBase<B, R>> =>
            pipe(
              _.ne,
              G.both(_.nw),
              G.both(_.sw),
              G.both(_.se),
              G.map(([[_1, ..._2], _3]) => [..._1, ..._2, _3] as const),
              G.map(([ne, nw, sw, se]) => new Leaf<B, R>(_.rect, ne, nw, sw, se))
            )
        })
      }
    }
  }
)

export function show<R>(_: Show<R>) {
  return Recursive.$.fold<QuadTreeF, string, unknown, R>(Functor, (tree) =>
    Match.tag(tree, {
      'Tip': (_) => `[ ${_.items.length} // ${_.rect.midpoint.show} // ${_.rect.min.show} _ ${_.rect.max.show}: `,
      'Leaf': (_) => `
| ${_.ne}  | ${_.nw} |
| ${_.se}  | ${_.sw} |
`
    }))
}
function refold<F extends HKT, A, B, E = unknown, R = unknown>(
  F: Covariant<F>,
  foldFn: Recursive.Fn<F, B, E, R>,
  unfoldFn: Unfolder.Fn<F, A, E, R>
): (z: A) => B {
  return (z: A): B =>
    pipe(
      unfoldFn(z),
      F.map(refold(F, foldFn, unfoldFn)),
      foldFn
    )
}
