package arcs.core.host

import arcs.core.sdk.Particle
import kotlin.reflect.KClass

/**
 * A [ParticleIdentifier] is a multiplatform identifier for [Class]. Since [Class] is not
 * serializable and deserializable on every platform, and Arcs architecture is inherently
 * distributed, a more portable representation is needed. This is loosely based on Android's
 * ComponentName class.
 *
 * @property package the Java package the [Particle] implementation resides in.
 * @property cls the Java classname (simple class name)
 */
data class ParticleIdentifier constructor(val pkg: String, val cls: String) {
    companion object {
        /** Converts from JVM canonical class name format. */
        fun from(location: String): ParticleIdentifier {
            val parts = location.splitToSequence('.')
            return ParticleIdentifier(
                parts.filter { x -> x[0].isLowerCase() }.joinToString("."),
                parts.filter { x -> x[0].isUpperCase() }.joinToString(".")
            )
        }

        fun from(kclass: KClass<out Particle>): ParticleIdentifier = from(kclass.java.canonicalName)
    }
}

fun KClass<out Particle>.toParticleIdentifier() = ParticleIdentifier.from(this)
