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
package arcs.core.storage.api

import arcs.core.common.ArcId
import arcs.core.data.CreatableStorageKey
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SchemaRegistry
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.DefaultDriverFactory
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.ForeignStorageKey
import arcs.core.storage.keys.JoinStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.testutil.assertFor
import arcs.core.testutil.doesNotFail
import arcs.jvm.storage.database.testutil.FakeDatabaseManager
import org.junit.Before
import org.junit.Test

// Note: this is a global object that was created a long time ago as a convenience. Ideally, we'd
// remove this completely in favor of a more explicit configuration approach. Since it exists,
// this test is a best effort at encoding the expected behavior for the methods.
class DriverAndKeyConfiguratorTest {
  @Before
  fun setup() {
    // The methods manipulate the default driver factory, capabilities resolvers map, and store key
    // parser manager. Since this object isn't set up very well for testing (and thus, should be
    // removed, one day), we need to manually reset the global state before each test.
    DefaultDriverFactory.update()
    StorageKeyManager.GLOBAL_INSTANCE.reset()
    CapabilitiesResolver.reset()
    SchemaRegistry.register(DUMMY_SCHEMA)
  }

  @Test
  fun configureKeyParsersAndFactories_configuresDefaultKeyParsersAndFactories() {
    DriverAndKeyConfigurator.configureKeyParsersAndFactories()

    ALL_KEY_TYPES.forEach {
      assertFor(it).doesNotFail {
        StorageKeyManager.GLOBAL_INSTANCE.parse(it.toString())
      }
    }
  }

  @Test
  fun configure_withNoDatabase_configuresDefaultsDrivers_andKeyParsers() {
    DriverAndKeyConfigurator.configure(null)

    ALL_NON_DB_DRIVER_KEYS.forEach {
      assertFor(it).that(DefaultDriverFactory.get().willSupport(it)).isTrue()
    }
    ALL_DB_DRIVER_KEYS.forEach {
      assertFor(it).that(DefaultDriverFactory.get().willSupport(it)).isFalse()
    }

    ALL_KEY_TYPES.forEach {
      assertFor(it).doesNotFail {
        StorageKeyManager.GLOBAL_INSTANCE.parse(it.toString())
      }
    }
  }

  @Test
  fun configure_withDatabase_configuresDefaultsDrivers_andKeyParsers() {
    DriverAndKeyConfigurator.configure(FakeDatabaseManager())

    ALL_NON_DB_DRIVER_KEYS.map {
      assertFor(it).that(DefaultDriverFactory.get().willSupport(it)).isTrue()
    }
    ALL_DB_DRIVER_KEYS.forEach {
      assertFor(it).that(DefaultDriverFactory.get().willSupport(it)).isTrue()
    }
    ALL_KEY_TYPES.forEach {
      assertFor(it).doesNotFail {
        StorageKeyManager.GLOBAL_INSTANCE.parse(it.toString())
      }
    }
  }

  companion object {
    private val DUMMY_SCHEMA = Schema(
      names = setOf(SchemaName("test")),
      fields = SchemaFields(emptyMap(), emptyMap()),
      hash = "abc123"
    )
    private val DUMMY_RAMDISK_KEY = RamDiskStorageKey("dummy")
    private val DUMMY_REFMODE_KEY = ReferenceModeStorageKey(DUMMY_RAMDISK_KEY, DUMMY_RAMDISK_KEY)
    private val DUMMY_VOLATILE_KEY = VolatileStorageKey(ArcId.newForTest("test"), "dummy")
    private val DUMMY_DB_KEY = DatabaseStorageKey.Persistent("test", DUMMY_SCHEMA.hash, "test")
    private val DUMMY_MEMDB_KEY = DatabaseStorageKey.Memory("test", DUMMY_SCHEMA.hash, "test")
    private val DUMMY_CREATABLE_KEY = CreatableStorageKey("test")
    private val DUMMY_JOIN_KEY = JoinStorageKey(listOf(DUMMY_RAMDISK_KEY, DUMMY_RAMDISK_KEY))
    private val DUMMY_FOREIGN_KEY = ForeignStorageKey("test")

    // The dummy keys created above are grouped into meaningful sets to be used in the tests
    // themselves. These named groups better telegraph the expected results of the helper methods
    // than manually verifying storage keys in the tests bodies themselves would.
    val ALL_KEY_TYPES = listOf(
      DUMMY_RAMDISK_KEY,
      DUMMY_REFMODE_KEY,
      DUMMY_VOLATILE_KEY,
      DUMMY_DB_KEY,
      DUMMY_MEMDB_KEY,
      DUMMY_CREATABLE_KEY,
      DUMMY_JOIN_KEY,
      DUMMY_FOREIGN_KEY
    )

    val ALL_NON_DB_DRIVER_KEYS = listOf(
      DUMMY_RAMDISK_KEY,
      DUMMY_VOLATILE_KEY
    )

    val ALL_DB_DRIVER_KEYS = listOf(
      DUMMY_DB_KEY,
      DUMMY_MEMDB_KEY
    )
  }
}
