/** @tsplus type graphics/Angle */
export interface Angle extends Case {
  _tag: 'Angle'
  radians: number
}
/** @tsplus type graphics/AngleOps */
export interface AngleOps {
  $: AngleAspects
}
export interface AngleAspects {}
export const Angle: AngleOps = {
  $: {}
}
/** @tsplus static graphics/AngleOps __call */
export const makeAngle = Case.tagged<Angle>('Angle')
/** @tsplus static graphics/AngleOps radians */
export const fromRadians = (radians: number) => Angle({ radians })
/** @tsplus static graphics/AngleOps degrees */
export const fromDegrees = (degrees: number) => Angle({ radians: degrees * (Math.PI / 180) })
/** @tsplus static graphics/AngleOps gradians */
export const fromGradians = (gradient: number) => Angle({ radians: gradient * (Math.PI / 200) })
/** @tsplus static graphics/AngleOps turns */
export const fromTurns = (turns: number) => Angle({ radians: turns * Math.PI * 2 })


/**
 * Add two angles
 *
 * @tsplus operator graphics/Angle +
 * @tsplus pipeable graphics/Angle plus
 * @tsplus static graphics/AngleOps plus
 */
export const plusAngle = (addend: Angle) => (augend: Angle) => Angle({ radians: augend.radians + addend.radians })

/**
 * Multiply a scalar and an angle
 *
 * @tsplus getter graphics/Angle times
 * @tsplus static graphics/AngleOps times
 */
export const timesScalar = (addend: Angle) => (i: number) => Angle.radians(addend.radians * i)

/**
 * @tsplus getter graphics/Angle degrees
 */
export const toDegrees = (self: Angle) => self.radians * (180 / Math.PI)

/**
 * @tsplus getter graphics/Angle cos
 */
export const cosineAngle = (self: Angle) => Math.cos(self.radians)
/**
 * @tsplus getter graphics/Angle sin
 */
export const sineAngle = (self: Angle) => Math.sin(self.radians)
