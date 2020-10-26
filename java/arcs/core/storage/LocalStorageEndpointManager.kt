package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.util.guardedBy
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * A [StorageEndpointManager] that creates [LocalStorageEndpoint]s wrapping a collection of
 * [ActiveStore]s managed directly in this instance.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class LocalStorageEndpointManager(
  private val scope: CoroutineScope,
  private val driverFactory: DriverFactory,
  private val writeBackProvider: WriteBackProvider
) : StorageEndpointManager {
  private val storesMutex = Mutex()
  private val stores by guardedBy(storesMutex, mutableMapOf<StorageKey, ActiveStore<*, *, *>>())

  override suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
    storeOptions: StoreOptions,
    callback: ProxyCallback<Data, Op, T>
  ): StorageEndpoint<Data, Op, T> {
    @Suppress("UNCHECKED_CAST")
    val store = storesMutex.withLock {
      stores.getOrPut(storeOptions.storageKey) {
        ActiveStore<Data, Op, T>(
          storeOptions,
          scope,
          driverFactory,
          writeBackProvider,
          null
        )
      }
    } as ActiveStore<Data, Op, T>
    val id = store.on(callback)
    return LocalStorageEndpoint(store, id)
  }

  /** Close all open stores, and reset the internal store map. */
  suspend fun reset() {
    storesMutex.withLock {
      stores.values.forEach { it.close() }
      stores.clear()
    }
  }
}

/** A [StorageEndpoint] that directly wraps an [ActiveStore]. */
class LocalStorageEndpoint<Data : CrdtData, Op : CrdtOperationAtTime, T>(
  private val store: ActiveStore<Data, Op, T>,
  private val id: Int
) : StorageEndpoint<Data, Op, T> {
  override suspend fun idle() = store.idle()

  override suspend fun onProxyMessage(
    message: ProxyMessage<Data, Op, T>
  ) = store.onProxyMessage(message.withId(id))

  override suspend fun close() = store.off(id)
}
