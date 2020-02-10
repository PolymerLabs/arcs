package arcs.core.host

import arcs.sdk.Particle

/**
 * [ExternalHost] is the base class for all Platform-specific non-isolated hosts.
 * Just a place holder for now, but serves as a marker for the [arcs.core.allocator.Allocator]
 * in the future, and likely to house Android or Browser specific state, like application
 * context or browser global scope.
 */
open class ExternalHost(vararg externalParticles: Particle) : AbstractArcHost() {
    init {
        externalParticles.forEach { registerParticle(it::class.toParticleIdentifier()) }
    }
}
