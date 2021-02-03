/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage.service

import androidx.annotation.VisibleForTesting
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ActiveStore
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import arcs.core.storage.UntypedActiveStore
import arcs.core.storage.WriteBackProvider
import arcs.core.util.guardedBy
import kotlinx.atomicfu.AtomicInt
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Thread-safe data-structure that keeps track of the active [ActiveStore]s and the number of
 * channels referencing them.
 */
class ReferencedStores(
  /** These are used when constructing [ActiveStore]s */
  private val scope: CoroutineScope,
  private val driverFactory: DriverFactory,
  private val writeBackProvider: WriteBackProvider,
  private val devToolsProxy: DevToolsProxyImpl?
) {

  private val mutex = Mutex()
  private val stores by guardedBy(mutex, mutableMapOf<StorageKey, ReferencedStore>())

  /**
   * Increments the count of a [ReferencedStore] identified by [StorageOptions.StorageKey] and
   * returns a corresponding [ReleasableStore]. If no such [ReferencedStore] for
   * [StorageOptions.StorageKey] exists, create one by creating a new [ActiveStore] and setting the
   * initial count to 0.
   */
  suspend fun getOrPut(storeOptions: StoreOptions): ReleasableStore = mutex.withLock {
    val referencedStore = stores.getOrPut(storeOptions.storageKey) {
      val newStore = ActiveStore<CrdtData, CrdtOperation, Any?>(
        storeOptions,
        scope,
        driverFactory,
        writeBackProvider,
        devToolsProxy
      )
      ReferencedStore(newStore, atomic(0))
    }
    referencedStore.count.incrementAndGet()
    ReleasableStore(referencedStore)
  }

  /** Remove and close all [ActiveStore]s in the map. */
  suspend fun clear() {
    val storesCopy: Map<StorageKey, ReferencedStore>
    mutex.withLock {
      storesCopy = stores.toMap()
      stores.clear()
    }
    storesCopy.forEach { (_, referencedStore) ->
      referencedStore.store.close()
    }
  }

  /** Returns the number of [ActiveStore]s that are currently stored. */
  suspend fun size(): Int = mutex.withLock { stores.size }

  /** Returns a [Set] of all [StorageKey]s of the stored [ActiveStore]s. */
  suspend fun storageKeys(): Set<StorageKey> = mutex.withLock { stores.keys }

  internal data class ReferencedStore(
    val store: UntypedActiveStore,
    val count: AtomicInt
  )

  inner class ReleasableStore internal constructor(
    private val referencedStore: ReferencedStore
  ) {
    val store: UntypedActiveStore get() = referencedStore.store
    private var released = false

    @VisibleForTesting
    val count: Int get() = referencedStore.count.value

    /**
     * Atomically decrements the count of the [ReferencedStore] by 1. If the count is then 0,
     * remove itself from [ReferencedStores.stores] and close the corresponding [ActiveStore].
     */
    suspend fun release() {
      check(!released) { "ReleasableStore has already been released." }

      var storeToClose: UntypedActiveStore? = null
      mutex.withLock {
        val count = referencedStore.count.decrementAndGet()
        check(count >= 0) { "Count for storage key ${store.storageKey} is negative." }
        if (count == 0) {
          storeToClose = stores.remove(store.storageKey)?.store
        }
        released = true
      }
      storeToClose?.close()
    }
  }
}
