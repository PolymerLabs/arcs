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

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.core.common.ArcId
import arcs.core.crdt.CrdtException
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SchemaRegistry
import arcs.core.data.SingletonType
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.ReadWriteSingletonHandle
import arcs.core.entity.ReadableHandle
import arcs.core.entity.Reference
import arcs.core.entity.awaitReady
import arcs.core.entity.testutil.DummyEntity
import arcs.core.entity.testutil.InlineDummyEntity
import arcs.core.host.HandleManagerImpl
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.Reference as StorageReference
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.DATABASE_NAME_DEFAULT
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.MockDriverProvider
import arcs.core.storage.testutil.testDatabaseDriverFactory
import arcs.core.storage.testutil.testDatabaseStorageEndpointManager
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.testutil.LogRule
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import arcs.jvm.util.JvmTime
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [StorageServiceManager]. */
@Suppress("UNCHECKED_CAST", "EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class StorageServiceManagerTest {
  @get:Rule
  val log = LogRule()

  private fun CoroutineScope.buildManager(dbm: DatabaseManager = dbManager) =
    StorageServiceManager(
      this,
      testDatabaseDriverFactory,
      dbm,
      ReferencedStores(
        { TestCoroutineScope() },
        { FixedDriverFactory(MockDriverProvider()) },
        ::testWriteBackProvider,
        null,
        JvmTime
      )
    )

  private val dbManager: DatabaseManager =
    AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
  private val time = FakeTime()
  private val scheduler = SimpleSchedulerProvider(Dispatchers.Default).invoke("test")
  private val ramdiskKey = ReferenceModeStorageKey(
    backingKey = RamDiskStorageKey("backing"),
    storageKey = RamDiskStorageKey("container")
  )
  private val arcId = ArcId.newForTest("foo")
  private val volatileKey = ReferenceModeStorageKey(
    backingKey = VolatileStorageKey(arcId, "backing"),
    storageKey = VolatileStorageKey(arcId, "container")
  )
  private val databaseKey = ReferenceModeStorageKey(
    backingKey = DatabaseStorageKey.Persistent("backing", DummyEntity.SCHEMA_HASH),
    storageKey = DatabaseStorageKey.Persistent("container", DummyEntity.SCHEMA_HASH)
  )

  @Before
  fun setUp() {
    DriverAndKeyConfigurator.configure(dbManager)
    SchemaRegistry.register(DummyEntity.SCHEMA)
    SchemaRegistry.register(InlineDummyEntity.SCHEMA)
  }

  @After
  fun tearDown() = runBlocking {
    scheduler.cancel()
    RamDisk.clear()
  }

  @Test
  fun databaseClearAll() = runBlocking {
    testClearAllForKey(buildManager(), databaseKey)
  }

  @Test
  fun ramdiskClearAll() = runBlocking {
    testClearAllForKey(buildManager(), ramdiskKey)
  }

  @Test
  fun volatileClearAll() = runBlocking {
    testClearAllForKey(buildManager(), volatileKey)
  }

  @Test
  fun databaseClearDataBetween() = runBlocking {
    testClearDataBetweenForKey(buildManager(), databaseKey, allRemoved = false)
  }

  @Test
  fun ramdiskClearDataBetween() = runBlocking {
    testClearDataBetweenForKey(buildManager(), ramdiskKey, allRemoved = true)
  }

  @Test
  fun volatileClearDataBetween() = runBlocking {
    testClearDataBetweenForKey(buildManager(), volatileKey, allRemoved = true)
  }

  @Test
  fun resetDatabases() = runBlocking {
    val handle = createCollectionHandle(databaseKey)
    val entity = DummyEntity().apply {
      num = 1.0
      texts = setOf("1", "one")
      inlineEntity = InlineDummyEntity().apply {
        text = "inline"
      }
    }
    handle.dispatchStore(entity)
    log("Wrote entity")

    val manager = buildManager()
    log("Resetting databases")
    val result = awaitResult { manager.resetDatabases(it) }

    assertThat(result).isTrue()

    val newHandle = createCollectionHandle(databaseKey)
    assertThat(newHandle.dispatchFetchAll()).isEmpty()

    // Double check that no tombstones are left.
    val database = DatabaseDriverProvider.manager.getDatabase(DATABASE_NAME_DEFAULT, true)
    val entityKey = databaseKey.backingKey.childKeyWithComponent(entity.entityId!!)
    // Entity is gone, no tombstone left.
    assertThat(database.get(entityKey, DatabaseData.Entity::class, DummyEntity.SCHEMA)).isNull()
    // Collection is gone too.
    assertThat(
      database.get(databaseKey.storageKey, DatabaseData.Collection::class, DummyEntity.SCHEMA)
    ).isNull()
  }

  @Test
  fun triggerHardReferenceDeletion_success() = runBlocking {
    val handle = createCollectionHandle(databaseKey)
    handle.dispatchStore(entityWithHardRef(REFERENCE_ID, databaseKey.backingKey))
    val updateReceived = handle.onUpdateDeferred { it.fetchAll().isEmpty() }
    val manager = buildManager()

    val result = suspendForHardReferencesCallback { resultCallback ->
      manager.triggerHardReferenceDeletion(
        databaseKey.backingKey.toString(),
        REFERENCE_ID,
        resultCallback
      )
    }

    assertThat(result).isEqualTo(1)
    // Create a new handle (with new HandleManager) to confirm data is gone from storage.
    assertThat(createCollectionHandle(databaseKey).dispatchFetchAll()).isEmpty()
    // Check the handle got the update.
    updateReceived.join()
  }

  @Test
  fun triggerHardReferenceDeletion_fail() = runBlocking<Unit> {
    val handle = createCollectionHandle(databaseKey)
    handle.dispatchStore(entityWithHardRef(REFERENCE_ID, databaseKey.backingKey))
    val manager = buildManager()

    assertFailsWith<CrdtException> {
      suspendForHardReferencesCallback { resultCallback ->
        manager.triggerHardReferenceDeletion("invalid", REFERENCE_ID, resultCallback)
      }
    }
  }

  @Test
  fun reconcileHardReferences_success() = runBlocking {
    val handle = createCollectionHandle(databaseKey)
    handle.dispatchStore(entityWithHardRef(REFERENCE_ID, databaseKey.backingKey))
    val updateReceived = handle.onUpdateDeferred { it.fetchAll().isEmpty() }
    val manager = buildManager()

    val result = suspendForHardReferencesCallback { resultCallback ->
      manager.reconcileHardReferences(
        databaseKey.backingKey.toString(),
        listOf("another id"),
        resultCallback
      )
    }

    assertThat(result).isEqualTo(1)
    // Create a new handle (with new HandleManager) to confirm data is gone from storage.
    assertThat(createCollectionHandle(databaseKey).dispatchFetchAll()).isEmpty()
    // Check the handle got the update.
    updateReceived.join()
  }

  @Test
  fun reconcileHardReferences_fail() = runBlocking<Unit> {
    val handle = createCollectionHandle(databaseKey)
    handle.dispatchStore(entityWithHardRef(REFERENCE_ID, databaseKey.backingKey))
    val manager = buildManager()

    assertFailsWith<CrdtException> {
      suspendForHardReferencesCallback { resultCallback ->
        manager.reconcileHardReferences("invalid", listOf("another id"), resultCallback)
      }
    }
  }

  @Test
  fun runGarbageCollection_success() = runBlocking {
    var dbManagerGcCalled = false
    val databaseManager: DatabaseManager = FakeDatabaseManager() { dbManagerGcCalled = true }
    val storageServiceManager = buildManager(databaseManager)

    val result = suspendForResultCallback { storageServiceManager.runGarbageCollection(it) }

    assertThat(result).isTrue()
    assertThat(dbManagerGcCalled).isTrue()
  }

  @Test
  fun runGarbageCollection_fail() = runBlocking<Unit> {
    val databaseManager: DatabaseManager = FakeDatabaseManager() { throw Exception("error") }
    val storageServiceManager = buildManager(databaseManager)

    val e = assertFailsWith<CrdtException> {
      suspendForResultCallback { storageServiceManager.runGarbageCollection(it) }
    }
    assertThat(e.message).isEqualTo("GarbageCollection failed")
  }

  private suspend fun testClearAllForKey(manager: StorageServiceManager, storageKey: StorageKey) {
    val handle = createSingletonHandle(storageKey)
    val entity = DummyEntity().apply {
      num = 1.0
      texts = setOf("1", "one")
      inlineEntity = InlineDummyEntity().apply {
        text = "inline"
      }
    }
    handle.dispatchStore(entity)
    log("Wrote entity")

    log("Clearing databases")
    val result = awaitResult { manager.clearAll(it) }

    assertThat(result).isTrue()

    // Create a new handle (with new Entity manager) to confirm data is gone from storage.
    val newHandle = createSingletonHandle(storageKey)
    assertThat(newHandle.dispatchFetch()).isNull()
  }

  private suspend fun testClearDataBetweenForKey(
    manager: StorageServiceManager,
    storageKey: StorageKey,
    allRemoved: Boolean
  ) {
    val entity1 = DummyEntity().apply { num = 1.0 }
    val entity2 = DummyEntity().apply { num = 2.0 }
    val entity3 = DummyEntity().apply { num = 3.0 }

    val handle = createCollectionHandle(storageKey)
    withTimeout(TIMEOUT) {
      time.millis = 1L
      handle.dispatchStore(entity1)

      time.millis = 2L
      handle.dispatchStore(entity2)

      time.millis = 3L
      handle.dispatchStore(entity3)
    }
    log("Wrote entities")

    log("Clearing data created at t=2")
    val result = awaitResult { manager.clearDataBetween(2, 2, it) }

    assertThat(result).isTrue()
    log("Clear complete, asserting")

    // Create a new handle (with new Entity manager) to confirm data is gone from storage.
    val newHandle = createCollectionHandle(storageKey)
    if (allRemoved) {
      assertThat(newHandle.dispatchFetchAll()).isEmpty()
    } else {
      // In case there are remaining entities, the changes should be propagated to the
      // original handle as well.
      assertThat(handle.dispatchFetchAll()).containsExactly(entity1, entity3)
      assertThat(newHandle.dispatchFetchAll()).containsExactly(entity1, entity3)
    }
  }

  private suspend fun awaitResult(block: (IResultCallback) -> Unit): Boolean =
    suspendForResultCallback { block(it) }

  private suspend fun createSingletonHandle(storageKey: StorageKey) =
    // Creates a new handle manager each time, to simulate arcs stop/start behavior.
    HandleManagerImpl(
      time = time,
      scheduler = scheduler,
      storageEndpointManager = testDatabaseStorageEndpointManager(),
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    ).createHandle(
      HandleSpec(
        "name",
        HandleMode.ReadWrite,
        SingletonType(EntityType(DummyEntity.SCHEMA)),
        DummyEntity
      ),
      storageKey
    ).awaitReady() as ReadWriteSingletonHandle<DummyEntity>

  private suspend fun createCollectionHandle(storageKey: StorageKey) =
    HandleManagerImpl(
      time = time,
      scheduler = scheduler,
      storageEndpointManager = testDatabaseStorageEndpointManager(),
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    ).createHandle(
      HandleSpec(
        "name",
        HandleMode.ReadWrite,
        CollectionType(EntityType(DummyEntity.SCHEMA)),
        DummyEntity
      ),
      storageKey
    ).awaitReady() as ReadWriteCollectionHandle<DummyEntity>

  private fun entityWithHardRef(hardRefId: String, backingKey: StorageKey) = DummyEntity().apply {
    num = 1.0
    hardRef = Reference(DummyEntity, StorageReference(hardRefId, backingKey, null))
    texts = setOf("1", "one")
    inlineEntity = InlineDummyEntity().apply {
      text = "inline"
    }
  }

  private fun <H : ReadableHandle<T, U>, T, U> H.onUpdateDeferred(
    predicate: (H) -> Boolean = { true }
  ) = Job().also { deferred ->
    onUpdate {
      if (deferred.isActive && predicate(this)) {
        deferred.complete()
      }
    }
  }

  companion object {
    private const val REFERENCE_ID = "referenceId"
    private const val TIMEOUT = 10_000L
  }
}
