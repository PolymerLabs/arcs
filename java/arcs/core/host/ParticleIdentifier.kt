package arcs.core.host

import kotlin.reflect.KClass

/**
 * A [ParticleIdentifier] is a multiplatform identifier for a [Particle] implementation.
 *
 * @property id the unique identifier for this particle implementation (usually qualified classname)
 */
data class ParticleIdentifier(val id: String) {
    companion object {
        /** Converts to JVM canonical class name format. */
        fun from(location: String) = ParticleIdentifier(location.replace('/', '.'))
    }
}

/** Creates a [ParticleIdenfifier] from a [KClass] */
fun KClass<out Particle>.toParticleIdentifier() = ParticleIdentifier.from(className())
