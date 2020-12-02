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

import arcs.android.storage.readStoreOptions
import arcs.core.storage.ActiveStore
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.UntypedActiveStore
import arcs.core.storage.UntypedProxyMessage
import arcs.core.storage.WriteBackProvider
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Implementation of the [IStorageServiceNg] AIDL interface. Responsible for forwarding messages
 * to [ActiveStore]s and back again.
 */
class StorageServiceNgImpl(
  private val scope: CoroutineScope,
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

  // TODO(b/173754821): Clean up stores when the channels are all closed/dead.
  // TODO(b/173755216): Implement link/unlinkToDeath handlers.
  private val stores = ConcurrentHashMap<StorageKey, UntypedActiveStore>()

  private val stats = BindingContextStatsImpl()

  /** Collection of [StorageKey]s of the stores the [StorageServiceNgImpl] provides a binding for */
  val activeStorageKeys: Collection<StorageKey>
    get() = stores.keys

  override fun openStorageChannel(
    parcelableStoreOptions: ByteArray,
    channelCallback: IStorageChannelCallback,
    messageCallback: IMessageCallback
  ) {
    val storeOptions = parcelableStoreOptions.readStoreOptions()

    scope.launch {
      // TODO(b/173671643): Remove potential for race condition when creating a store.
      var store = stores[storeOptions.storageKey]
      if (store == null) {
        store = ActiveStore(
          storeOptions,
          scope,
          driverFactory,
          writeBackProvider,
          devToolsProxy
        )
        stores[storeOptions.storageKey] = store
      }
      channelCallback.onCreate(
        StorageChannelImpl.create(store, scope, stats, messageCallback, onProxyMessageCallback)
      )
    }
  }
}
