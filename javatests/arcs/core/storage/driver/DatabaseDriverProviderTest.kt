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
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.StorageKey
import arcs.core.storage.database.DatabaseManager
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [RamDiskDriverProvider]. */
@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class DatabaseDriverProviderTest {
  private var databaseManager: DatabaseManager? = null
  private val schemaHashLookup = mutableMapOf<String, Schema>()

  private val provider = DatabaseDriverProvider.configure(databaseFactory(), schemaHashLookup::get)

  @After
  fun tearDown() {
    databaseManager = null
    schemaHashLookup.clear()
  }

  @Test
  fun willSupport_returnsTrue_whenDatabaseKey_andSchemaFound() = runBlockingTest {
    schemaHashLookup["1234a"] = DUMMY_SCHEMA

    val key = DatabaseStorageKey.Persistent("foo", "1234a")
    assertThat(provider.willSupport(key)).isTrue()
  }

  @Test
  fun willSupport_returnsFalse_whenNotDatabaseKey() = runBlockingTest {
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
    val key = DatabaseStorageKey.Persistent("foo", "1234a")
    assertThat(provider.willSupport(key)).isFalse()
  }

  @Test
  fun getDriver_throwsOnInvalidKey_wrongType() = runBlockingTest {
    val volatile = VolatileStorageKey(ArcId.newForTest("myarc"), "foo")

    assertSuspendingThrows(IllegalArgumentException::class) {
      provider.getDriver(volatile, CrdtEntity.Data::class)
    }
  }

  @Test
  fun getDriver_throwsOnInvalidKey_schemaNotFound() = runBlockingTest {
    val key = DatabaseStorageKey.Persistent("foo", "1234a")

    assertSuspendingThrows(IllegalArgumentException::class) {
      provider.getDriver(key, CrdtEntity.Data::class)
    }
  }

  @Test
  fun getDriver_throwsOnInvalidDataClass() = runBlockingTest {
    val key = DatabaseStorageKey.Persistent("foo", "1234a")
    schemaHashLookup["1234a"] = DUMMY_SCHEMA

    assertSuspendingThrows(IllegalArgumentException::class) {
      provider.getDriver(key, Int::class)
    }
  }

  @Test
  fun getDriver() = runBlockingTest {
    val key = DatabaseStorageKey.Persistent("foo", "1234a")
    schemaHashLookup["1234a"] = DUMMY_SCHEMA

    val entityDriver = provider.getDriver(key, CrdtEntity.Data::class)
    assertThat(entityDriver).isInstanceOf(DatabaseDriver::class.java)
    assertThat(entityDriver.storageKey).isEqualTo(key)

    val setDriver = provider.getDriver(key, CrdtSet.DataImpl::class)
    assertThat(setDriver).isInstanceOf(DatabaseDriver::class.java)
    assertThat(setDriver.storageKey).isEqualTo(key)

    val singletonDriver = provider.getDriver(key, CrdtSingleton.DataImpl::class)
    assertThat(singletonDriver).isInstanceOf(DatabaseDriver::class.java)
    assertThat(singletonDriver.storageKey).isEqualTo(key)
  }

  private fun databaseFactory(): DatabaseManager =
    databaseManager ?: FakeDatabaseManager().also { databaseManager = it }

  companion object {
    private val DUMMY_SCHEMA = Schema(
      setOf(SchemaName("mySchema")),
      SchemaFields(
        mapOf("name" to FieldType.Text),
        mapOf("cities_lived_in" to FieldType.Text)
      ),
      "1234a"
    )
  }
}
