package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation

/**
 * A [StorageEndpointManager] gives us [StorageEndpoint]s of particular types.
 */
interface StorageEndpointManager {
  /**
   * Returns a [StorageEndpoint] for the requested [StoreOptions], of the specified
   * type parameters. It will receive messages from the underlying store via the provided
   * [ProxyCallback].
   *
   * Implementations *may* choose to cache [StorageEndpoint] instances internally, so a
   * call to get for the same parameters may or may not return the same object, depending on the
   * implementation.
   */
  suspend fun <Data : CrdtData, Op : CrdtOperation, T> get(
    storeOptions: StoreOptions,
    callback: ProxyCallback<Data, Op, T>
  ): StorageEndpoint<Data, Op, T>
}
