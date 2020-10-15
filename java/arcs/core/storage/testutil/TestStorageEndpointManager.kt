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
  scope: CoroutineScope = CoroutineScope(Dispatchers.Default),
  storeManager: StoreManager = StoreManager(scope, ::testWriteBackProvider)
) = DirectStorageEndpointManager(storeManager)

fun testStoreManager(
  scope: CoroutineScope = CoroutineScope(Dispatchers.Default)
) = StoreManager(scope, ::testWriteBackProvider)
