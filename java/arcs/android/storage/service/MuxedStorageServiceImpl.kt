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

import arcs.android.storage.decodeStoreOptions
import arcs.core.storage.DirectStoreMuxerImpl
import arcs.core.storage.DriverFactory
import arcs.core.storage.StorageKey
import arcs.core.storage.UntypedDirectStoreMuxer
import arcs.core.storage.WriteBackProvider
import arcs.core.util.statistics.TransactionStatisticsImpl
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Implementation of the [IMuxedStorageService] AIDL interface. Responsible for forwarding messages
 * to [DirectStorageMuxers] and back again.
 */
class MuxedStorageServiceImpl(
  private val scope: CoroutineScope,
  private val stats: TransactionStatisticsImpl,
  private val driverFactory: DriverFactory,
  private val writeBackProvider: WriteBackProvider,
  private val devToolsProxy: DevToolsProxyImpl?
) : IMuxedStorageService.Stub() {
  init {
    if (!BuildFlags.ENTITY_HANDLE_API) {
      throw BuildFlagDisabledError("ENTITY_HANDLE_API")
    }
  }

  // TODO(b/162747024): Replace this with an LruCache so its size doesn't grow unbounded.
  private val directStoreMuxers = ConcurrentHashMap<StorageKey, UntypedDirectStoreMuxer>()

  override fun openMuxedStorageChannel(
    encodedStoreOptions: ByteArray,
    channelCallback: IStorageChannelCallback,
    messageCallback: IMessageCallback
  ) {
    val storeOptions = encodedStoreOptions.decodeStoreOptions()
    val directStoreMuxer = directStoreMuxers.computeIfAbsent(storeOptions.storageKey) {
      DirectStoreMuxerImpl(
        storageKey = storeOptions.storageKey,
        backingType = storeOptions.type,
        scope = scope,
        driverFactory = driverFactory,
        writeBackProvider = writeBackProvider,
        devTools = devToolsProxy
      )
    }
    scope.launch {
      channelCallback.onCreate(
        MuxedStorageChannelImpl.create(directStoreMuxer, scope, stats, messageCallback)
      )
    }
  }
}
