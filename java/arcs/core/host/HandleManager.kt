package arcs.core.host

import arcs.core.data.Capability
import arcs.core.entity.Handle
import arcs.core.entity.HandleSpec
import arcs.core.storage.StorageKey

/**
 * This interface defines the functionality of a component that manages all of the active
 * handles for one particular scope.
 *
 * In most cases, "scope" means an Arc. It is possible to use a [HandleManager] to manage groups
 * of [Handle]s for other groupings. This is currently not a supported use case for Arcs clients,
 * but we may use this internally for storage stack testing.
 */
interface HandleManager {
    /** Create a new handle owned by this handle manager. */
    suspend fun createHandle(
        spec: HandleSpec,
        storageKey: StorageKey,
        ttl: Capability.Ttl = Capability.Ttl.Infinite(),
        particleId: String = "",
        immediateSync: Boolean = true
    ): Handle

    /** Close all handles created by this handle manager. */
    suspend fun close()
}
