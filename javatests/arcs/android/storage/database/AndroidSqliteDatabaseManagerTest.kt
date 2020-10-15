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

package arcs.android.storage.database

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.util.toReferencable
import arcs.core.storage.Reference
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.testutil.DummyStorageKey
import com.google.common.truth.Truth.assertThat
import java.util.Random
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class AndroidSqliteDatabaseManagerTest {
  private lateinit var manager: DatabaseManager
  private lateinit var random: Random

  val key = DummyStorageKey("key")
  val refKey = DummyStorageKey("refkey")
  val schema = Schema(
    emptySet(),
    SchemaFields(
      singletons = mapOf("text" to FieldType.Text),
      collections = mapOf("refs" to FieldType.EntityRef("hash"))
    ),
    "hash"
  )
  val entity = DatabaseData.Entity(
    RawEntity("entity", mapOf("text" to "abc".toReferencable()), mapOf("refs" to emptySet()), 123),
    schema,
    1,
    VersionMap("me" to 1)
  )

  @Before
  fun setUp() {
    manager = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
    random = Random(System.currentTimeMillis())
    StorageKeyParser.addParser(DummyStorageKey)
  }

  @Test
  fun getDatabase() = runBlockingTest {
    val database = manager.getDatabase("foo", true)
    assertThat(database).isInstanceOf(DatabaseImpl::class.java)
  }

  @Test
  fun getDatabases() = runBlockingTest {
    val databaseFoo = manager.getDatabase("foo", true)
    assertThat(databaseFoo).isInstanceOf(DatabaseImpl::class.java)

    val databaseBar = manager.getDatabase("bar", true)
    assertThat(databaseBar).isInstanceOf(DatabaseImpl::class.java)
    assertThat(databaseFoo).isNotEqualTo(databaseBar)
    assertThat(databaseFoo).isNotSameInstanceAs(databaseBar)

    val databaseFooMemory = manager.getDatabase("foo", false)
    assertThat(databaseFooMemory).isInstanceOf(DatabaseImpl::class.java)
    assertThat(databaseFoo).isNotEqualTo(databaseBar)
    assertThat(databaseFoo).isNotSameInstanceAs(databaseBar)
  }

  @Test
  fun getSameDatabase_returnsSameObject() = runBlockingTest {
    val firstFoo = manager.getDatabase("foo", true)
    val secondFoo = manager.getDatabase("foo", true)

    assertThat(firstFoo).isInstanceOf(DatabaseImpl::class.java)
    assertThat(secondFoo).isInstanceOf(DatabaseImpl::class.java)
    assertThat(firstFoo).isSameInstanceAs(secondFoo)
  }

  @Test
  fun getSameDatabase_concurrently_returnsSameObject() = runBlockingTest {
    val firstFoo = async {
      delay(random.nextInt(1000).toLong())
      manager.getDatabase("foo", true)
    }
    val secondFoo = async {
      delay(random.nextInt(1000).toLong())
      manager.getDatabase("foo", true)
    }

    assertThat(firstFoo.await()).isSameInstanceAs(secondFoo.await())
  }

  @Test
  fun resetDatabaseIfTooLarge() = runBlockingTest {
    // A manager with a small maximum size (5 bytes).
    manager =
      AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext(), 5)
    val database = manager.getDatabase("foo", true)
    database.insertOrUpdate(key, entity)
    assertThat(database.get(key, DatabaseData.Entity::class, schema)).isEqualTo(entity)

    manager.removeExpiredEntities()

    // The database has been reset and the entity has been tombstoned.
    val nulledEntity = DatabaseData.Entity(
      RawEntity("entity", mapOf("text" to null), mapOf("refs" to emptySet()), 123),
      schema,
      1,
      VersionMap("me" to 1)
    )
    assertThat(database.get(key, DatabaseData.Entity::class, schema)).isEqualTo(nulledEntity)
  }

  @Test
  fun resetDatabases() = runBlockingTest {
    val database = manager.getDatabase("foo", true)
    database.insertOrUpdate(key, entity)
    assertThat(database.get(key, DatabaseData.Entity::class, schema)).isEqualTo(entity)

    manager.resetAll()

    // Entity is gone, no tombstone left.
    assertThat(database.get(key, DatabaseData.Entity::class, schema)).isNull()
  }

  @Test
  fun doesNotResetDatabaseIfSmallEnough() = runBlockingTest {
    // A manager with a larger maximum size (200 kilobytes).
    manager =
      AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext(), 200000)
    val database = manager.getDatabase("foo", true)
    database.insertOrUpdate(key, entity)
    assertThat(database.get(key, DatabaseData.Entity::class, schema)).isEqualTo(entity)

    manager.removeExpiredEntities()

    // The database has NOT been reset.
    assertThat(database.get(key, DatabaseData.Entity::class, schema)).isEqualTo(entity)
  }

  @Test
  fun test_getEntitiesCount() = runBlockingTest {
    // A manager with a larger maximum size (50 kilobytes).
    manager =
      AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext(), 50000)
    assertThat(manager.getEntitiesCount(true)).isEqualTo(0)
    assertThat(manager.getEntitiesCount(false)).isEqualTo(0)

    val onDiskDatabase1 = manager.getDatabase("foo1", true)
    val onDiskDatabase2 = manager.getDatabase("foo2", true)
    val inMemoryDatabase1 = manager.getDatabase("bar1", false)
    val inMemoryDatabase2 = manager.getDatabase("bar2", false)
    val inMemoryDatabase3 = manager.getDatabase("bar3", false)
    onDiskDatabase1.insertOrUpdate(key, entity)
    onDiskDatabase2.insertOrUpdate(key, entity)
    inMemoryDatabase1.insertOrUpdate(key, entity)
    inMemoryDatabase2.insertOrUpdate(key, entity)
    inMemoryDatabase3.insertOrUpdate(key, entity)
    assertThat(manager.getEntitiesCount(true)).isEqualTo(2)
    assertThat(manager.getEntitiesCount(false)).isEqualTo(3)

    manager.removeAllEntities()
    // GC twice as entities are marked as orphan the first time, removed the second time.
    manager.runGarbageCollection()
    manager.runGarbageCollection()
    assertThat(manager.getEntitiesCount(true)).isEqualTo(0)
    assertThat(manager.getEntitiesCount(false)).isEqualTo(0)
  }

  @Test
  fun test_getStorageSize() = runBlockingTest {
    // A manager with a larger maximum size (50 kilobytes).
    manager =
      AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext(), 50000)
    val onDiskDatabase = manager.getDatabase("foo", true)
    val inMemoryDatabase = manager.getDatabase("bar", false)
    val initialOnDiskSize = manager.getStorageSize(true)
    val initialInMemorySize = manager.getStorageSize(false)
    assertThat(initialOnDiskSize).isGreaterThan(0)
    assertThat(initialInMemorySize).isGreaterThan(0)

    onDiskDatabase.insertOrUpdate(key, entity)
    inMemoryDatabase.insertOrUpdate(key, entity)
    val loadedOnDiskSize = manager.getStorageSize(true)
    val loadedInMemorySize = manager.getStorageSize(false)
    assertThat(loadedInMemorySize).isAtLeast(initialInMemorySize)
    assertThat(loadedOnDiskSize).isAtLeast(initialOnDiskSize)

    manager.removeAllEntities()
    // GC twice as entities are marked as orphan the first time, removed the second time.
    manager.runGarbageCollection()
    manager.runGarbageCollection()
    val clearedOnDiskSize = manager.getStorageSize(true)
    val clearedInMemorySize = manager.getStorageSize(false)
    assertThat(clearedInMemorySize).isAtMost(initialInMemorySize)
    assertThat(clearedOnDiskSize).isAtMost(initialOnDiskSize)
  }

  @Test
  fun test_isStorageTooLarge_smallMaxSize() = runBlockingTest {
    // A manager with a small maximum size (1 byte).
    manager =
      AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext(), 1)
    manager.getDatabase("foo", true)
    assertThat(manager.isStorageTooLarge()).isTrue()
  }

  @Test
  fun test_isStorageTooLarge_largeMaxSize() = runBlockingTest {
    // A manager with a larger maximum size (50 kilobytes).
    manager =
      AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext(), 500000)
    manager.getDatabase("foo", true)
    assertThat(manager.isStorageTooLarge()).isFalse()
  }

  @Test
  fun getAllHardReferenceIds() = runBlockingTest {
    manager.getDatabase("foo", true).insertOrUpdate(key, entityWithHardRef("id1"))
    manager.getDatabase("bar", false).insertOrUpdate(key, entityWithHardRef("id2"))

    assertThat(manager.getAllHardReferenceIds(refKey)).containsExactly("id1", "id2")
  }

  private fun entityWithHardRef(refId: String) = DatabaseData.Entity(
    RawEntity(
      collections = mapOf("refs" to setOf(Reference(refId, refKey, null, isHardReference = true)))
    ),
    schema,
    1,
    VersionMap("me" to 1)
  )
}
