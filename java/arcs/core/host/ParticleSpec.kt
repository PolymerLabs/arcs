package arcs.core.host

/**
 * A [ParticleSpec] consists of the information neccessary to instantiate a particle
 * when starting an arc.
 * [manifestName] is human readable of the Particle in the recipe.
 * [location] is either a fully qualified Java class name, or a filesystem path.
 */
data class ParticleSpec(val manifestName: String, val location: String)
