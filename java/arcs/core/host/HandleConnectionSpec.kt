package arcs.core.host

/**
 * Represents a use of a [Handle] by a [Particle].
 */
data class HandleConnectionSpec(
    val connectionName: String,
    val usedHandle: HandleSpec,
    val usingParticle: ParticleSpec
)
