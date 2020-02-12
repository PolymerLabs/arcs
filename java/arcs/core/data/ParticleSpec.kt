package arcs.core.data

/**
 * A [ParticleSpec] consists of the information necessary to instantiate a particle
 * when starting an arc.
 * @property particleName is human readable name of the Particle in the recipe.
 * @property location is either a fully qualified Java class name, or a filesystem path.
 * @property handles is a map from particle connection name to connection info.
 */
data class ParticleSpec(
    val particleName: String,
    val location: String,
    val handles: Map<String, HandleConnectionSpec>
)
