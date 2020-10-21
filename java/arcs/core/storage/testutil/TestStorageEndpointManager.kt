package arcs.core.storage.testutil

import arcs.core.storage.DriverFactory
import arcs.core.storage.LocalStorageEndpointManager
import arcs.core.storage.StoreWriteBack
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.test.TestCoroutineDispatcher
import kotlinx.coroutines.test.TestCoroutineScope

val testScope = TestCoroutineScope(TestCoroutineDispatcher())

/** Provide a [StoreWriteBack] instance that uses a [TestCoroutineScope], for testing purposes. */
fun testWriteBackProvider(protocol: String) =
  StoreWriteBack(
    protocol,
    Channel.UNLIMITED,
    false,
    testScope
  )

/** Provide a [LocalStorageEndpointManager] with typical test defaults. */
fun testStorageEndpointManager(
  scope: CoroutineScope = testScope,
  driverFactory: DriverFactory = testDriverFactory
) = LocalStorageEndpointManager(scope, driverFactory, ::testWriteBackProvider)

/** Provide a [LocalStorageEndpointManager] with typical test defaults and database support. */
fun testDatabaseStorageEndpointManager(
  scope: CoroutineScope = testScope
) = testStorageEndpointManager(scope, testDatabaseDriverFactory)
