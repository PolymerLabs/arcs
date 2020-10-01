package arcs.core.storage.testutil

import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.StoreManager
import arcs.core.storage.WriteBackImpl
import arcs.core.storage.WriteBackProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel

fun simpleTestWritebackProvider(
  coroutineScope: CoroutineScope
): WriteBackProvider {
  return { protocol ->
    WriteBackImpl(protocol, Channel.UNLIMITED, true, coroutineScope)
  }
}

fun testStorageEndpointManager(
  coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.Default),
  writeBackProvider: WriteBackProvider = simpleTestWritebackProvider(coroutineScope)
) = DirectStorageEndpointManager(StoreManager(coroutineScope, writeBackProvider))

fun testStoreManager(
  coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.Default),
  writeBackProvider: WriteBackProvider = simpleTestWritebackProvider(coroutineScope)
) = StoreManager(coroutineScope, writeBackProvider)
