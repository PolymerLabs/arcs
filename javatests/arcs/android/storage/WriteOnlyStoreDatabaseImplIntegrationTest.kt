/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.storage

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.storage.database.AndroidSqliteDatabaseManager
import arcs.android.storage.database.DatabaseImpl.Companion.DATABASE_CRDT_ACTOR
import arcs.android.util.testutil.AndroidLogRule
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.SchemaRegistry
import arcs.core.entity.testutil.FixtureEntities
import arcs.core.entity.testutil.FixtureEntity
import arcs.core.storage.ActiveStore
import arcs.core.storage.DriverFactory
import arcs.core.storage.FixedDriverFactory
import arcs.core.storage.ProxyMessage
import arcs.core.storage.RawReference
import arcs.core.storage.ReferenceModeStore
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.StoreOptions
import arcs.core.storage.UntypedActiveStore
import arcs.core.storage.WriteOnlyDirectStore
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.database.ReferenceWithVersion
import arcs.core.storage.driver.DatabaseDriver
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.keys.DATABASE_NAME_DEFAULT
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.core.testutil.IntInRange
import arcs.core.testutil.runFuzzTest
import arcs.flags.BuildFlags
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestCoroutineDispatcher
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Integration test that includes the WriteOnlyDirectStore, DatabaseDriver and DatabaseImpl to
 * verify the whole storage stack works as expected in write-only mode.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class WriteOnlyStoreDatabaseImplIntegrationTest {
  @get:Rule
  val log = AndroidLogRule()

  private lateinit var driverFactory: DriverFactory
  private lateinit var databaseManager: DatabaseManager
  private val scope = TestCoroutineScope(TestCoroutineDispatcher())
  private val fixtureEntities = FixtureEntities()

  @Before
  fun setUp() = runBlockingTest {
    BuildFlags.WRITE_ONLY_STORAGE_STACK = true
    StorageKeyManager.GLOBAL_INSTANCE.reset(DatabaseStorageKey.Persistent)
    databaseManager = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
    DatabaseDriverProvider.configure(databaseManager, SchemaRegistry::getSchema)
    driverFactory = FixedDriverFactory(DatabaseDriverProvider)
  }

  @Test
  fun writeOnlyStore_addEntity_readByReferenceModeStore() = runBlockingTest {
    val (writeStore, readStore) = createStores()
    val op = CrdtSet.Operation.Add("actor", VersionMap(), entity(ID))

    invariant_storeRoundTrip_sameAsCrdtModel(writeStore, readStore, listOf(op))
  }

  @Test
  fun writeOnlyStore_sequenceOfOps_readByReferenceModeStore() = runBlockingTest {
    val (writeStore, readStore) = createStores()
    val ops = listOf(
      CrdtSet.Operation.Add("actor", VersionMap(), entity("id1")),
      CrdtSet.Operation.Clear("actor", VersionMap()),
      CrdtSet.Operation.Add("actor", VersionMap(), entity("id2")),
      CrdtSet.Operation.Add("actor", VersionMap(), entity("id3")),
      CrdtSet.Operation.Remove("actor", VersionMap(), "id3")
    )

    invariant_storeRoundTrip_sameAsCrdtModel(writeStore, readStore, ops)
  }

  @Test
  fun writeOnlyStore_sequenceOfOps_readByReferenceModeStore_FuzzTest() = runFuzzTest {
    // Write in write-only-mode, read with ref-mode-store.
    val writeOnlyStack = StoresStack(
      createStore(true, TEST_KEY),
      createStore(false, TEST_KEY)
    )
    // Write and read with ref-mode-store.
    val refModeStack = StoresStack(
      createStore(false, TEST_KEY_2),
      createStore(false, TEST_KEY_2)
    )
    val ops = FixtureEntitiesOperationsGenerator(it, IntInRange(it, 1, 20))

    invariant_storeRoundTrip_sameAsCrdtModelReadBack(writeOnlyStack, refModeStack, ops())
  }

  @Test
  fun writeOnlyStore_propagatesToDatabase() = runBlockingTest {
    val (writeStore, _) = createStores()
    val entity = entity(ID)
    val op = CrdtSet.Operation.Add("actor", VersionMap(), entity)

    writeStore.onProxyMessage(ProxyMessage.Operations(listOf(op), 1))

    val database = databaseManager.getDatabase(DATABASE_NAME_DEFAULT, true)
    val expectedEntity =
      DatabaseData.Entity(entity, FixtureEntity.SCHEMA, 1, DatabaseDriver.ENTITIES_VERSION_MAP)
    val expectedCollection = DatabaseData.Collection(
      values = setOf(
        ReferenceWithVersion(
          RawReference(ID, TEST_KEY.backingKey, VersionMap()),
          VersionMap(DATABASE_CRDT_ACTOR to 1)
        )
      ),
      schema = FixtureEntity.SCHEMA,
      databaseVersion = 1,
      versionMap = VersionMap(DATABASE_CRDT_ACTOR to 1)
    )
    assertThat(database.readEntity()).isEqualTo(expectedEntity)
    assertThat(database.readCollection()).isEqualTo(expectedCollection)
  }

  // Regression test for b/182713034.
  @Test
  fun databaseRoundTrip_sameAsCrdtModel() = runFuzzTest {
    val (writeStore, readStore) = createStores()
    val ops = FixtureEntitiesOperationsGenerator(it, IntInRange(it, 1, 20))

    invariant_storeRoundTrip_sameAsCrdtModel(writeStore, readStore, ops())
  }

  private suspend fun createStores(): Pair<UntypedActiveStore, UntypedActiveStore> {
    val writeStore = createStore(true)
    assertThat(writeStore).isInstanceOf(WriteOnlyDirectStore::class.java)
    val readStore = createStore(false)
    assertThat(readStore).isInstanceOf(ReferenceModeStore::class.java)
    return writeStore to readStore
  }

  private suspend fun createStore(writeOnly: Boolean, storageKey: StorageKey = TEST_KEY) =
    ActiveStore<CrdtData, CrdtOperation, Any?>(
      StoreOptions(
        storageKey,
        CollectionType(EntityType(FixtureEntity.SCHEMA)),
        writeOnly = writeOnly
      ),
      scope,
      driverFactory,
      ::testWriteBackProvider,
      null,
      JvmTime
    )

  private fun entity(id: String) = fixtureEntities.generate(id).serialize()

  private suspend fun Database.readEntity(): DatabaseData.Entity? {
    val entityKey = TEST_KEY.backingKey.newKeyWithComponent(ID)
    return get(entityKey, DatabaseData.Entity::class, FixtureEntity.SCHEMA) as? DatabaseData.Entity
  }

  private suspend fun Database.readCollection(): DatabaseData.Collection? {
    val collectionKey = TEST_KEY.storageKey
    return get(
      collectionKey,
      DatabaseData.Collection::class,
      FixtureEntity.SCHEMA
    ) as? DatabaseData.Collection
  }

  companion object {
    private const val ID = "ID"
    private val HASH = FixtureEntity.SCHEMA.hash
    private val TEST_KEY = ReferenceModeStorageKey(
      DatabaseStorageKey.Persistent("entities", HASH),
      DatabaseStorageKey.Persistent("set", HASH)
    )
    private val TEST_KEY_2 = ReferenceModeStorageKey(
      DatabaseStorageKey.Persistent("entities2", HASH),
      DatabaseStorageKey.Persistent("set2", HASH)
    )
  }
}
