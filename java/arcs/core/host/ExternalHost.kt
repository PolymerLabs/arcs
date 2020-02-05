package arcs.core.host

/**
 * [ExternalHost] is the base class for all Android-specific non-isolated hosts.
 * Just a place holder for now, but serves as a marker for the [Allocator]
 * in the future, and likely to house Android specific state, like application
 * context.
 */
abstract class ExternalHost : AbstractArcHost()
