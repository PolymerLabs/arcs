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
import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.data.SchemaRegistry
import arcs.core.entity.DummyEntity
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.HandleSpec
import arcs.core.entity.InlineDummyEntity
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.awaitReady
import arcs.core.host.EntityHandleManager
import arcs.core.storage.StorageKey
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testDatabaseDriverFactory
import arcs.core.storage.testutil.testDatabaseStorageEndpointManager
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.testutil.LogRule
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.coroutineContext
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [StorageServiceManager]. */
@Suppress("UNCHECKED_CAST", "EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class StorageServiceEndToEndTest {
  @get:Rule
  val log = LogRule()

  private suspend fun buildManager() =
    StorageServiceManager(coroutineContext, testDatabaseDriverFactory, ConcurrentHashMap())

  private val time = FakeTime()
  private val scheduler = JvmSchedulerProvider(EmptyCoroutineContext).invoke("test")
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

  private lateinit var databaseManager: AndroidSqliteDatabaseManager

  @Before
  fun setUp() {
    databaseManager = AndroidSqliteDatabaseManager(
      ApplicationProvider.getApplicationContext()
    )
    DriverAndKeyConfigurator.configure(databaseManager)

    SchemaRegistry.register(DummyEntity.SCHEMA)
    SchemaRegistry.register(InlineDummyEntity.SCHEMA)
  }

  @After
  fun tearDown() = runBlocking {
    scheduler.cancel()
    RamDisk.clear()
  }

  @Test
  fun writeThenRead_nullInlines_inCollection_onDatabase() = runBlocking {
    val handle = createCollectionHandle(databaseKey)
    val entity = emptyEntityForTest()

    handle.dispatchStore(entity)

    val handle2 = createCollectionHandle(databaseKey)
    assertThat(handle2.dispatchFetchAll()).containsExactly(entity)
    Unit
  }

  @Test
  fun writeThenRead_inlineData_inCollection_onDatabase() = runBlocking {
    val handle = createCollectionHandle(databaseKey)
    val entity = entityForTest()

    handle.dispatchStore(entity)

    databaseManager.runGarbageCollection()
    databaseManager.runGarbageCollection()

    val handle2 = createCollectionHandle(databaseKey)
    assertThat(handle2.dispatchFetchAll()).containsExactly(entity)
    Unit
  }

  @Test
  fun updateEntity_inlineData_inCollection_onDatabase() = runBlocking {
    val handle = createCollectionHandle(databaseKey)
    val entity = entityForTest()

    handle.dispatchStore(entity)
    assertThat(createCollectionHandle(databaseKey).dispatchFetchAll()).containsExactly(entity)

    // Modify entity.
    entity.inlineList = listOf(
      InlineDummyEntity().apply { text = "1.1" },
      InlineDummyEntity().apply { text = "2.2" },
      InlineDummyEntity().apply { text = "33." }
    )
    handle.dispatchStore(entity)
    assertThat(createCollectionHandle(databaseKey).dispatchFetchAll()).containsExactly(entity)

    Unit
  }

  @Test
  fun writeThenRead_inlineData_inCollection_onDatabase_withExpiry() = runBlocking {
    val handle = createCollectionHandle(databaseKey, Ttl.Hours(1))
    val entity = entityForTest()
    val entity2 = entityForTest()

    time.millis = System.currentTimeMillis()
    handle.dispatchStore(entity)
    time.millis = 1L
    handle.dispatchStore(entity2)

    databaseManager.removeExpiredEntities()

    val handle2 = createCollectionHandle(databaseKey)
    time.millis = System.currentTimeMillis()
    assertThat(handle2.dispatchFetchAll()).containsExactly(entity)
    Unit
  }

  @Test
  fun writeThenRead_inlineData_inCollection_onDatabase_withGC() = runBlocking {
    val handle = createCollectionHandle(databaseKey)
    val entity = entityForTest()

    handle.dispatchStore(entity)

    databaseManager.runGarbageCollection()
    databaseManager.runGarbageCollection()

    val handle2 = createCollectionHandle(databaseKey)
    assertThat(handle2.dispatchFetchAll()).containsExactly(entity)
    Unit
  }

  @Test
  fun writeThenRead_inlineData_inCollection_onRamdisk() = runBlocking {
    val handle = createCollectionHandle(ramdiskKey)
    val entity = entityForTest()

    handle.dispatchStore(entity)

    val handle2 = createCollectionHandle(ramdiskKey)
    assertThat(handle2.dispatchFetchAll()).containsExactly(entity)
    Unit
  }

  @Test
  fun writeThenRead_inlineData_inCollection_onVolatile() = runBlocking {
    val handle = createCollectionHandle(volatileKey)
    val entity = entityForTest()

    handle.dispatchStore(entity)

    val handle2 = createCollectionHandle(volatileKey)
    assertThat(handle2.dispatchFetchAll()).containsExactly(entity)
    Unit
  }

  private fun emptyEntityForTest() = DummyEntity()

  private fun entityForTest() = DummyEntity().apply {
    inlineEntity = InlineDummyEntity().apply {
      text = "inline"
    }
    inlineList = listOf(
      InlineDummyEntity().apply { text = "1" },
      InlineDummyEntity().apply { text = "2" },
      InlineDummyEntity().apply { text = "3" }
    )
    inlines = setOf(
      InlineDummyEntity().apply { text = "C1" },
      InlineDummyEntity().apply { text = "C2" },
      InlineDummyEntity().apply { text = "C3" }
    )
  }

  private suspend fun createCollectionHandle(
    storageKey: StorageKey,
    expiry: Ttl = Ttl.Infinite()
  ) = EntityHandleManager(
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
    storageKey,
    expiry
  ).awaitReady() as ReadWriteCollectionHandle<DummyEntity>
}
