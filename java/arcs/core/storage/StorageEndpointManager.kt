package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime

/**
 * A [StorageEndpointManager] gives us [StorageEndpointProvider]s of particular types.
 */
interface StorageEndpointManager {
    /**
     * Returns a [StorageEndpoint] for the requested [StoreOptions], of the specified
     * type parameters. It will receive messages from the underlying store via the provided
     * [ProxyCallback].
     *
     * Implementations *may* choose to cache [StorageEndpointProvider] instances internally, so a
     * call to get for the same parameters may or may not return the same object, depending on the
     * implementation.
     */
    suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
        storeOptions: StoreOptions,
        callback: ProxyCallback<Data, Op, T>
    ): StorageEndpoint<Data, Op, T>

    /**
     * Resets any internal state for this storage endpoint manager.
     */
    suspend fun reset()
}
