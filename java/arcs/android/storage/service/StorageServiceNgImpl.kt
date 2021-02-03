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

package arcs.android.storage.service

import androidx.annotation.VisibleForTesting
import arcs.android.storage.readStoreOptions
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ActiveStore
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import arcs.core.storage.UntypedActiveStore
import arcs.core.storage.UntypedProxyMessage
import arcs.core.storage.WriteBackProvider
import arcs.core.util.guardedBy
import arcs.core.util.statistics.TransactionStatisticsImpl
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Implementation of the [IStorageServiceNg] AIDL interface. Responsible for forwarding messages
 * to [ActiveStore]s and back again.
 */
class StorageServiceNgImpl(
  private val scope: CoroutineScope,
  private val stats: TransactionStatisticsImpl,
  private val driverFactory: DriverFactory,
  private val writeBackProvider: WriteBackProvider,
  private val devToolsProxy: DevToolsProxyImpl?,
  /** Callback to trigger when a proxy message has been received and sent to the store. */
  private val onProxyMessageCallback: suspend (StorageKey, UntypedProxyMessage) -> Unit
) : IStorageServiceNg.Stub() {

  init {
    if (!BuildFlags.STORAGE_SERVICE_NG) {
      throw BuildFlagDisabledError("STORAGE_SERVICE_NG")
    }
  }

  private val actionLauncher = SequencedActionLauncher(scope)

  private val storesMutex = Mutex()
  private val stores by guardedBy(storesMutex, ConcurrentHashMap<StorageKey, UntypedActiveStore>())
  private val storeChannelCount by guardedBy(storesMutex, ChannelCounter())

  override fun openStorageChannel(
    parcelableStoreOptions: ByteArray,
    channelCallback: IStorageChannelCallback,
    messageCallback: IMessageCallback
  ) {
    val storeOptions = parcelableStoreOptions.readStoreOptions()

    actionLauncher.launch {
      val store = getOrCreateStore(storeOptions)
      val channel = StorageChannelImpl.create(
        store,
        scope,
        stats,
        messageCallback,
        ::onChannelClose,
        onProxyMessageCallback
      )
      storesMutex.withLock {
        storeChannelCount.increment(storeOptions.storageKey)
      }
      channelCallback.onCreate(channel)
    }
  }

  private suspend fun getOrCreateStore(
    storeOptions: StoreOptions
  ): ActiveStore<CrdtData, CrdtOperation, Any?> {
    return storesMutex.withLock {
      if (stores.containsKey(storeOptions.storageKey)) {
        stores[storeOptions.storageKey] as ActiveStore<CrdtData, CrdtOperation, Any?>
      } else {
        val newStore = ActiveStore<CrdtData, CrdtOperation, Any?>(
          storeOptions,
          scope,
          driverFactory,
          writeBackProvider,
          devToolsProxy
        )
        stores[storeOptions.storageKey] = newStore
        newStore
      }
    }
  }

  private suspend fun onChannelClose(storageKey: StorageKey) {
    var storeToClose: UntypedActiveStore? = null
    storesMutex.withLock {
      val wasRemoved = storeChannelCount.decrement(storageKey)
      if (wasRemoved) {
        storeToClose = checkNotNull(stores.remove(storageKey)) {
          "There is no store with storage key $storageKey."
        }
      }
    }
    storeToClose?.close()
  }

  /** Copy of the [StorageKey]s of the stores the [StorageServiceNgImpl] provides a binding for */
  suspend fun activeStorageKeys(): Set<StorageKey> = storesMutex.withLock {
    stores.keys.toSet()
  }

  /**
   * Copy of the number of channels open for each [StorageKey] the [StorageServiceNgImpl] provides
   * a binding for.
   */
  @VisibleForTesting
  suspend fun channelCountForActiveStorageKeys(): Map<StorageKey, Int> = storesMutex.withLock {
    storeChannelCount.toMap()
  }
}

/**
 * Non thread-safe counter class to track counts for specified [StorageKey]s.
 */
private class ChannelCounter() {
  private val counters = mutableMapOf<StorageKey, Int>()

  /**
   * Increments the counter specified by the given [StorageKey] and returns the resulting count. If
   * the [StorageKey] has no counter, create a new counter for the given [StorageKey] with an
   * an initial count of 1 and return that initial count.
   */
  fun increment(storageKey: StorageKey): Int {
    val count = counters.getOrDefault(storageKey, 0) + 1
    counters[storageKey] = count
    return count
  }

  /**
   * Decrements the counter specified by the given [StorageKey] and removes the counter for the
   * [StorageKey] if the count reaches 0. Return a boolean value indicating if the counter has been
   * remove.
   *
   * An error is thrown if there is no counter for the given [StorageKey] or if the count becomes
   * negative.
   */
  fun decrement(storageKey: StorageKey): Boolean {
    val count = checkNotNull(counters[storageKey]) {
      "There is no entry in the ChannelCounter for storage key $storageKey."
    } - 1
    check(count >= 0) { "Channel count for storage key $storageKey is negative." }
    if (count == 0) {
      counters.remove(storageKey)
      return true
    }
    counters[storageKey] = count
    return false
  }

  /**
   * Returns a copy of the counter in the form of a map.
   */
  fun toMap(): Map<StorageKey, Int> = counters.toMap()
}
