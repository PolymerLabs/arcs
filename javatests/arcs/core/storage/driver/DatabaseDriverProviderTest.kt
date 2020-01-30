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

package arcs.core.storage.driver

import arcs.core.common.ArcId
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.DriverFactory
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.StorageKey
import arcs.core.storage.database.DatabaseFactory
import arcs.core.storage.database.MockDatabaseFactory
import arcs.core.testutil.assertSuspendingThrows
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.coroutines.coroutineContext

/** Tests for [RamDiskDriverProvider]. */
@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DatabaseDriverProviderTest {
    private var databaseFactory: DatabaseFactory? = null
    private val schemaHashLookup = mutableMapOf<String, Schema>()

    @After
    fun tearDown() {
        databaseFactory = null
        DriverFactory.clearRegistrationsForTesting()
        schemaHashLookup.clear()
    }

    @Test
    fun registersSelfWithDriverFactory() = runBlockingTest {
        DatabaseDriverProvider.configure(databaseFactory(), schemaHashLookup::get) // Constructor registers self.
        schemaHashLookup["1234a"] = DUMMY_SCHEMA

        assertThat(
            DriverFactory.willSupport(DatabaseStorageKey("foo", "1234a"))
        ).isTrue()
    }

    @Test
    fun willSupport_returnsTrue_whenDatabaseKey_andSchemaFound() = runBlockingTest {
        val provider = DatabaseDriverProvider.configure(databaseFactory(), schemaHashLookup::get)
        schemaHashLookup["1234a"] = DUMMY_SCHEMA

        val key = DatabaseStorageKey("foo", "1234a")
        assertThat(provider.willSupport(key)).isTrue()
    }

    @Test
    fun willSupport_returnsFalse_whenNotDatabaseKey() = runBlockingTest {
        val provider = DatabaseDriverProvider.configure(databaseFactory(), schemaHashLookup::get)
        val ramdisk = RamDiskStorageKey("foo")
        val volatile = VolatileStorageKey(ArcId.newForTest("myarc"), "foo")
        val other = object : StorageKey("outofnowhere") {
            override fun toKeyString(): String = "something"
            override fun childKeyWithComponent(component: String): StorageKey = this
        }

        assertThat(provider.willSupport(ramdisk)).isFalse()
        assertThat(provider.willSupport(volatile)).isFalse()
        assertThat(provider.willSupport(other)).isFalse()
    }

    @Test
    fun willSupport_returnsFalse_whenSchemaNotFound() = runBlockingTest {
        val provider = DatabaseDriverProvider.configure(databaseFactory(), schemaHashLookup::get)

        val key = DatabaseStorageKey("foo", "1234a")
        assertThat(provider.willSupport(key)).isFalse()
    }

    @Test
    fun getDriver_throwsOnInvalidKey_wrongType() = runBlockingTest {
        val provider = DatabaseDriverProvider.configure(databaseFactory(), schemaHashLookup::get)
        val volatile = VolatileStorageKey(ArcId.newForTest("myarc"), "foo")

        assertSuspendingThrows(IllegalArgumentException::class) {
            provider.getDriver(volatile, ExistenceCriteria.ShouldCreate, Int::class)
        }
    }

    @Test
    fun getDriver_throwsOnInvalidKey_schemaNotFound() = runBlockingTest {
        val provider = DatabaseDriverProvider.configure(databaseFactory(), schemaHashLookup::get)
        val key = DatabaseStorageKey("foo", "1234a")

        assertSuspendingThrows(IllegalArgumentException::class) {
            provider.getDriver(key, ExistenceCriteria.ShouldCreate, Int::class)
        }
    }

    private suspend fun databaseFactory(): DatabaseFactory =
        databaseFactory ?: MockDatabaseFactory(coroutineContext).also { databaseFactory = it}

    companion object {
        private val DUMMY_SCHEMA = Schema(
            listOf(SchemaName("mySchema")),
            SchemaFields(
                mapOf("name" to FieldType.Text),
                mapOf("cities_lived_in" to FieldType.Text)
            ),
            SchemaDescription(),
            "1234a"
        )
    }
}
