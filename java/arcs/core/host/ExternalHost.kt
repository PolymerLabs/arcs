package arcs.core.host

/**
 * [ExternalHost] is the base class for all Platform-specific non-isolated hosts.
 * Just a place holder for now, but serves as a marker for the [arcs.core.allocator.Allocator]
 * in the future, and likely to house Android or Browser specific state, like application
 * context or browser global scope.
 */
abstract class ExternalHost(
    vararg externalParticles: ParticleRegistration
) : AbstractArcHost(*externalParticles)
