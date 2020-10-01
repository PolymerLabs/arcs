package arcs.core.storage.testutil

import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.StoreManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers

fun testStorageEndpointManager(
  coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.Default)
) = DirectStorageEndpointManager(StoreManager(coroutineScope))

fun testStoreManager(
  coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.Default)
) = StoreManager(coroutineScope)
