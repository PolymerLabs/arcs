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
import arcs.core.storage.StorageKey
import arcs.core.storage.UntypedProxyMessage
import arcs.core.util.statistics.TransactionStatisticsImpl
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import kotlinx.coroutines.CoroutineScope

/**
 * Implementation of the [IStorageServiceNg] AIDL interface. Responsible for forwarding messages
 * to [ActiveStore]s and back again.
 */
class StorageServiceNgImpl(
  private val scope: CoroutineScope,
  private val stats: TransactionStatisticsImpl,
  /** Callback to trigger when a proxy message has been received and sent to the store. */
  private val onProxyMessageCallback: suspend (StorageKey, UntypedProxyMessage) -> Unit,
  /** Cache of active [ActiveStore]s. */
  private val stores: ReferencedStores
) : IStorageServiceNg.Stub() {

  init {
    if (!BuildFlags.STORAGE_SERVICE_NG) {
      throw BuildFlagDisabledError("STORAGE_SERVICE_NG")
    }
  }

  private val actionLauncher = SequencedActionLauncher(scope)

  override fun openStorageChannel(
    parcelableStoreOptions: ByteArray,
    channelCallback: IStorageChannelCallback,
    messageCallback: IMessageCallback
  ) {
    val storeOptions = parcelableStoreOptions.readStoreOptions()

    actionLauncher.launch {
      val store = stores.getOrPut(storeOptions)
      val channel = StorageChannelImpl.create(
        store,
        scope,
        stats,
        messageCallback,
        onProxyMessageCallback
      )
      channelCallback.onCreate(channel)
    }
  }
}
