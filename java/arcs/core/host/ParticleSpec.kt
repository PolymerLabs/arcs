package arcs.core.host

/**
 * A [ParticleSpec] consists of the information neccessary to instantiate a particle
 * when starting an arc.
 * @property particleName is human readable name of the Particle in the recipe.
 * @property location is either a fully qualified Java class name, or a filesystem path.
 */
data class ParticleSpec(val particleName: String, val location: String)
