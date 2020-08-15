package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime

/**
 * A [StorageEndpointManager] gives us [StorageEndpointProvider]s of particular types.
 */
interface StorageEndpointManager {
    /**
     * Returns a [StorageEndpointProvider] for the requested [StoreOptions], of the specified
     * type parameters.
     *
     * Implementations *may* choose to cache [StorageEndpointProvider] instances internally, so a
     * call to get for the same parameters may or may not return the same object, depending on the
     * implementation.
     */
    suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
        storeOptions: StoreOptions
    ): StorageEndpointProvider<Data, Op, T>

    fun close()
}
