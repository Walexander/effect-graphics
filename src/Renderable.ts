export interface Renderable<F, R = unknown, E = never> {
  readonly draw: (renderable: F) => Effect<R, E, unknown>
}
