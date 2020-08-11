package arcs.core.host

/**
 * Provides instances of [HandleManager] that are configured for a specific platform.
 *
 * A [HandleManager] instance can be shared across a process, it won't maintain any state specific
 * to individual Arcs.
 */
interface HandleManagerProvider {
    fun create(arcId: String, hostId: String): HandleManager
}
