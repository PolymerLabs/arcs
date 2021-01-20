/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.util.guardedBy
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * A [StorageEndpointManager] that creates [LocalStorageEndpoint]s wrapping a collection of
 * [ActiveStore]s managed directly in this instance.
 */
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
