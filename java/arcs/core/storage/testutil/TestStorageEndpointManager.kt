package arcs.core.storage.testutil

import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.StoreManager
import arcs.core.storage.StoreWriteBack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.test.TestCoroutineDispatcher
import kotlinx.coroutines.test.TestCoroutineScope

fun testWriteBackProvider(protocol: String) =
  StoreWriteBack(
    protocol,
    Channel.UNLIMITED,
    false,
    TestCoroutineScope(TestCoroutineDispatcher())
  )

fun testStorageEndpointManager(
  coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.Default),
  storeManager: StoreManager = StoreManager(coroutineScope, ::testWriteBackProvider)
) = DirectStorageEndpointManager(storeManager)

fun testStoreManager(
  coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.Default)
) = StoreManager(coroutineScope, ::testWriteBackProvider)
