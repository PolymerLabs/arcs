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
 * Store manager provides a central holding places for the [ActiveStore] instances that a runtime will
 * use, so that only one instance of an [ActiveStore] can be created per [StorageKey].
 */
class StoreManager(
  /** This [CoroutineScope] will be provided to newly created [ActiveStore]s. */
  private val coroutineScope: CoroutineScope,
  private val writeBackProvider: WriteBackProvider
) {
  private val storesMutex = Mutex()
  private val stores by guardedBy(storesMutex, mutableMapOf<StorageKey, ActiveStore<*, *, *>>())

  @Suppress("UNCHECKED_CAST")
  suspend fun <Data : CrdtData, Op : CrdtOperationAtTime, T> get(
    storeOptions: StoreOptions
  ) = storesMutex.withLock {
    stores.getOrPut(storeOptions.storageKey) {
      ActiveStore<Data, Op, T>(storeOptions, coroutineScope, writeBackProvider, null)
    } as ActiveStore<Data, Op, T>
  }

  suspend fun waitForIdle() {
    storesMutex.withLock {
      stores.values.forEach { it.idle() }
    }
  }

  /**
   * Drops all [ActiveStore] instances.
   */
  suspend fun reset() {
    storesMutex.withLock {
      stores.values.also {
        stores.clear()
      }
    }.forEach {
      it.close()
    }
  }
}
