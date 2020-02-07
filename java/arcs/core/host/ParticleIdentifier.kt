package arcs.core.host

import arcs.sdk.Particle
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

/**
 * Creates a [ParticleIdenfifier] from a [KClass].
 *
 * There's a multiplatform workaround here. Since [KClass.qualifiedName] is not available on JS,
 * this uses toString() to obtain the internal class name and replaces inner-class '$' separators
 * with '.'
 */
fun KClass<out Particle>.toParticleIdentifier() = ParticleIdentifier.from(
    this
        .toString() // format is "interface|class|enum foo.bar.Bar$Inner<Type> (error messages)"
        .substringAfter(' ')
        .substringBefore(' ')
        .substringBefore('<')
        .replace('$', '.')
)
