package arcs.core.storage.testutil

import arcs.core.storage.DirectStorageEndpointManager
import arcs.core.storage.StoreManager

fun testStorageEndpointManager() = DirectStorageEndpointManager(StoreManager())
