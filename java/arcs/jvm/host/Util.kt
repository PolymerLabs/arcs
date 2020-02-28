package arcs.jvm.host

import arcs.core.host.Particle
import arcs.core.host.ParticleConstructor
import arcs.core.host.ParticleIdentifier
import arcs.core.host.ParticleRegistration
import arcs.core.host.toParticleIdentifier
import kotlin.reflect.KClass

/** Returns a pair mapping [ParticleIdentifier] to [ParticleConstructor] */
fun KClass<out Particle>.toRegistration(): Pair<ParticleIdentifier, ParticleConstructor> =
    this.toParticleIdentifier() to this.toConstructor()

/** Return a [ParticleConstructor] via Kotlin reflection. */
fun KClass<out Particle>.toConstructor(): ParticleConstructor = {
    this@toConstructor.java.newInstance()
}

/**
 * Convert an array of [Particle] class literals to an [Array] of [ParticleRegistration].
 */
fun Array<out KClass<out Particle>>.toRegistrationList(): Array<ParticleRegistration> =
    this.map { it -> it.toRegistration() }.toTypedArray()
