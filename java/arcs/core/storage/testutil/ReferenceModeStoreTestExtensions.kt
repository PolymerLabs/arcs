package arcs.core.storage.testutil

import arcs.core.analytics.Analytics
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.storage.DriverFactory
import arcs.core.storage.ReferenceModeStore
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import arcs.jvm.util.JvmTime
import kotlinx.coroutines.CoroutineScope

/** Constructs a new singleton [ReferenceModeStore] for testing purposes. */
suspend fun ReferenceModeStore.Companion.singletonTestStore(
  storageKey: StorageKey,
  schema: Schema,
  scope: CoroutineScope,
  driverFactory: DriverFactory = testDatabaseDriverFactory
): ReferenceModeStore {
  return create(
    options = StoreOptions(
      storageKey = storageKey,
      type = SingletonType(EntityType(schema))
    ),
    scope = scope,
    driverFactory = driverFactory,
    writeBackProvider = ::testWriteBackProvider,
    devTools = null,
    time = JvmTime,
    Analytics.defaultAnalytics
  )
}

/** Constructs a new collection [ReferenceModeStore] for testing purposes. */
suspend fun ReferenceModeStore.Companion.collectionTestStore(
  storageKey: StorageKey,
  schema: Schema,
  scope: CoroutineScope,
  driverFactory: DriverFactory = testDatabaseDriverFactory
): ReferenceModeStore {
  return create(
    options = StoreOptions(
      storageKey = storageKey,
      type = CollectionType(EntityType(schema))
    ),
    scope = scope,
    driverFactory = driverFactory,
    writeBackProvider = ::testWriteBackProvider,
    devTools = null,
    time = JvmTime,
    Analytics.defaultAnalytics
  )
}
