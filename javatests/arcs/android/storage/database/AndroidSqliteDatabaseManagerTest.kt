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
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.testutil.DummyStorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.Random

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class AndroidSqliteDatabaseManagerTest {
    private lateinit var manager: DatabaseManager
    private lateinit var random: Random

    val key = DummyStorageKey("key")
    val schema = Schema(
        emptySet(),
        SchemaFields(singletons = mapOf("text" to FieldType.Text), collections = mapOf()),
        "hash"
    )
    val entity = DatabaseData.Entity(
        RawEntity("entity", mapOf("text" to "abc".toReferencable()), mapOf()),
        schema,
        1,
        VersionMap("me" to 1)
    )

    @Before
    fun setUp() {
        manager = AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext())
        random = Random(System.currentTimeMillis())
        DummyStorageKey.registerParser()
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
            AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext(), null, 5)
        val database = manager.getDatabase("foo", true)
        database.insertOrUpdate(key, entity)
        assertThat(database.get(key,DatabaseData.Entity::class, schema)).isEqualTo(entity)

        manager.removeExpiredEntities()

        // The database has been reset and the entity has been tombstoned.
        val nulledEntity = DatabaseData.Entity(
            RawEntity("entity", mapOf("text" to null), mapOf()),
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
        assertThat(database.get(key,DatabaseData.Entity::class, schema)).isEqualTo(entity)

        manager.resetAll()

        // Entity is gone, no tombstone left.
        assertThat(database.get(key, DatabaseData.Entity::class, schema)).isNull()
    }

    @Test
    fun doesNotResetDatabaseIfSmallEnough() = runBlockingTest {
        // A manager with a larger maximum size (50 kilobytes).
        manager =
            AndroidSqliteDatabaseManager(ApplicationProvider.getApplicationContext(), null, 50000)
        val database = manager.getDatabase("foo", true)
        database.insertOrUpdate(key, entity)
        assertThat(database.get(key,DatabaseData.Entity::class, schema)).isEqualTo(entity)

        manager.removeExpiredEntities()

        // The database has NOT been reset.
        assertThat(database.get(key,DatabaseData.Entity::class, schema)).isEqualTo(entity)
    }
}
