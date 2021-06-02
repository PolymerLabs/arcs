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
import arcs.core.data.Capability.Ttl
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.HandleMode
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.HandleSpec
import arcs.core.entity.ReadWriteCollectionHandle
import arcs.core.entity.awaitReady
import arcs.core.entity.testutil.FixtureEntities
import arcs.core.entity.testutil.FixtureEntity
import arcs.core.entity.testutil.FixtureEntitySlice
import arcs.core.host.HandleManagerImpl
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testDatabaseStorageEndpointManager
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchRemove
import arcs.core.testutil.handles.dispatchSize
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Integration tests for database bulk deletes. */
@Suppress("UNCHECKED_CAST", "EXPERIMENTAL_API_USAGE")
@RunWith(AndroidJUnit4::class)
class BulkDeletesIntegrationTest {
  @get:Rule
  val log = LogRule()

  private val time = FakeTime()
  private val scheduler = SimpleSchedulerProvider(EmptyCoroutineContext).invoke("test")
  private val databaseKey = ReferenceModeStorageKey(
    backingKey = DatabaseStorageKey.Persistent("backing"),
    storageKey = DatabaseStorageKey.Persistent("container")
  )
  private val fixtureEntities = FixtureEntities()

  private lateinit var databaseManager: AndroidSqliteDatabaseManager

  @Before
  fun setUp() {
    databaseManager = AndroidSqliteDatabaseManager(
      ApplicationProvider.getApplicationContext()
    )
    DriverAndKeyConfigurator.configure(databaseManager)
  }

  @After
  fun tearDown() = runBlocking {
    scheduler.cancel()
  }

  @Test
  fun garbageCollection_doesNotAffectStoredEntities() = runBlocking<Unit> {
    val entity = fixtureEntities.generate()
    createCollectionHandle().dispatchStore(entity)

    databaseManager.runGarbageCollection()
    databaseManager.runGarbageCollection()

    assertThat(createCollectionHandle().dispatchFetchAll()).containsExactly(entity)
  }

  @Test
  fun ttl_removesExpiredEntity() = runBlocking<Unit> {
    val handle = createCollectionHandle(Ttl.Hours(1))
    val entity = fixtureEntities.generate()
    val entity2 = fixtureEntities.generate()
    time.millis = System.currentTimeMillis()
    handle.dispatchStore(entity)
    // Store entity2 in the past so that it is already expired.
    time.millis = 1L
    handle.dispatchStore(entity2)
    time.millis = System.currentTimeMillis()

    databaseManager.removeExpiredEntities()

    // This handle does not have ttl, so it won't filter expired entities. Therefore we are
    // verifying the entity is gone from storage.
    assertThat(createCollectionHandle().dispatchFetchAll()).containsExactly(entity)
  }

  @Test
  fun garbageCollection_overlappingIds_doesNotAffectStoredEntities() = runBlocking {
    val handle = createCollectionHandle()
    // This entity will have an ID like !214414803790787:arc:nohost0:name1:2.
    val entity = fixtureEntities.generate()
    handle.dispatchStore(entity)
    // Add another 20 entities, as a regression test for b/170219293.
    // The last added ID will be something like !214414803790787:arc:nohost0:name1:22. It contains
    // the first entity ID.
    repeat(20) {
      handle.dispatchStore(fixtureEntities.generate())
    }
    // Remove entity, so that it will be garbage collected.
    handle.dispatchRemove(entity)

    databaseManager.runGarbageCollection()
    databaseManager.runGarbageCollection()

    assertThat(createCollectionHandle().dispatchSize()).isEqualTo(20)
  }

  @Test
  fun clearData_removeCreatedBetween() = runBlocking<Unit> {
    val handle = createCollectionHandle()
    val entity = fixtureEntities.generate()
    val entity2 = fixtureEntities.generate()
    time.millis = 100L
    handle.dispatchStore(entity)
    time.millis = 200L
    handle.dispatchStore(entity2)
    time.millis = System.currentTimeMillis()

    databaseManager.removeEntitiesCreatedBetween(150, 200)

    assertThat(createCollectionHandle().dispatchFetchAll()).containsExactly(entity)
  }

  @Test
  fun clearData_removeAll() = runBlocking {
    val handle = createCollectionHandle()
    handle.dispatchStore(fixtureEntities.generate())
    handle.dispatchStore(fixtureEntities.generate())

    databaseManager.removeAllEntities()

    assertThat(createCollectionHandle().dispatchFetchAll()).isEmpty()
  }

  @Test
  fun resetDatabases() = runBlocking {
    val handle = createCollectionHandle()
    handle.dispatchStore(fixtureEntities.generate())
    handle.dispatchStore(fixtureEntities.generate())

    databaseManager.resetAll()

    assertThat(createCollectionHandle().dispatchFetchAll()).isEmpty()
  }

  @Test
  fun removeEntitiesHardReferencing() = runBlocking<Unit> {
    val handle = createCollectionHandle()
    val storageKey = DatabaseStorageKey.Persistent("backing")
    val entity1 = fixtureEntities.generate().mutate(
      hardReferenceField = fixtureEntities.createInnerEntityReference("hardref-1", storageKey)
    )
    val entity2 = fixtureEntities.generate().mutate(
      hardReferenceField = fixtureEntities.createInnerEntityReference("hardref-2", storageKey)
    )
    handle.dispatchStore(entity1)
    handle.dispatchStore(entity2)

    databaseManager.removeEntitiesHardReferencing(storageKey, "hardref-1")

    assertThat(createCollectionHandle().dispatchFetchAll()).containsExactly(entity2)
  }

  private suspend fun createCollectionHandle(
    expiry: Ttl = Ttl.Infinite()
  ) = HandleManagerImpl(
    time = time,
    scheduler = scheduler,
    storageEndpointManager = testDatabaseStorageEndpointManager(),
    foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
  ).createHandle(
    HandleSpec(
      "name",
      HandleMode.ReadWrite,
      CollectionType(EntityType(FixtureEntity.SCHEMA)),
      FixtureEntity
    ),
    databaseKey,
    expiry
  ).awaitReady() as ReadWriteCollectionHandle<FixtureEntity, FixtureEntitySlice>
}
