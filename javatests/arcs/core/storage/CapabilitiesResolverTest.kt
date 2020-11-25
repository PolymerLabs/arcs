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

package arcs.core.storage

import arcs.core.common.ArcId
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Persistence
import arcs.core.data.Capability.Shareable
import arcs.core.data.Capability.Ttl
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.CapabilitiesResolver.Options
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CapabilitiesResolver]. */
@RunWith(JUnit4::class)
class CapabilitiesResolverTest {
  @After
  fun tearDown() {
    CapabilitiesResolver.reset()
  }

  private inline fun <reified T : StorageKey> verifyStorageKey(key: StorageKey) {
    assertThat(key).isInstanceOf(ReferenceModeStorageKey::class.java)
    assertThat((key as ReferenceModeStorageKey).backingKey is T).isTrue()
    assertThat(key.storageKey is T).isTrue()
  }

  @Test
  fun registerKeyCreator_nonUnique_fails() {
    CapabilitiesResolver.registerStorageKeyFactory(VolatileStorageKey.VolatileStorageKeyFactory())
    assertFailsWith<IllegalArgumentException> {
      CapabilitiesResolver.registerStorageKeyFactory(VolatileStorageKey.VolatileStorageKeyFactory())
    }
  }

  @Test
  fun createStorageKey_unsupported_fails() {
    val resolver = CapabilitiesResolver(Options(ArcId.newForTest("test")))
    // Verify storage keys for none of the capabilities cannot be created.
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(UNSPECIFIED, ENTITY_TYPE, HANDLE_ID)
    }
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(IN_MEMORY, ENTITY_TYPE, HANDLE_ID)
    }
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(IN_MEMORY_WITH_TTLS, ENTITY_TYPE, HANDLE_ID)
    }
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(ON_DISK, ENTITY_TYPE, HANDLE_ID)
    }
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(ON_DISK_WITH_TTL, ENTITY_TYPE, HANDLE_ID)
    }
  }

  @Test
  fun createStorageKey_volatileRegistered_onlyVolatileCreated() {
    // Register volatile storage key factory.
    CapabilitiesResolver.registerStorageKeyFactory(VolatileStorageKey.VolatileStorageKeyFactory())
    val resolver = CapabilitiesResolver(Options(ArcId.newForTest("test")))
    // Verify only volatile (in-memory, no ttl) storage key can be created.
    verifyStorageKey<VolatileStorageKey>(
      resolver.createStorageKey(UNSPECIFIED, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<VolatileStorageKey>(
      resolver.createStorageKey(IN_MEMORY, ENTITY_TYPE, HANDLE_ID)
    )
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(IN_MEMORY_WITH_TTLS, ENTITY_TYPE, HANDLE_ID)
    }
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(ON_DISK, ENTITY_TYPE, HANDLE_ID)
    }
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(ON_DISK_WITH_TTL, ENTITY_TYPE, HANDLE_ID)
    }
  }

  @Test
  fun createStorageKey_database_success() {
    CapabilitiesResolver.registerStorageKeyFactory(DatabaseStorageKey.Memory.Factory())
    CapabilitiesResolver.registerStorageKeyFactory(DatabaseStorageKey.Persistent.Factory())
    val resolver = CapabilitiesResolver(Options(ArcId.newForTest("test")))
    verifyStorageKey<DatabaseStorageKey.Memory>(
      resolver.createStorageKey(UNSPECIFIED, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<DatabaseStorageKey.Memory>(
      resolver.createStorageKey(IN_MEMORY, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<DatabaseStorageKey.Memory>(
      resolver.createStorageKey(IN_MEMORY_WITH_TTLS, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<DatabaseStorageKey.Persistent>(
      resolver.createStorageKey(ON_DISK, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<DatabaseStorageKey.Persistent>(
      resolver.createStorageKey(ON_DISK_WITH_TTL, ENTITY_TYPE, HANDLE_ID)
    )
  }

  @Test
  fun createStorageKey_registerAllKeys_success() {
    DriverAndKeyConfigurator.configureKeyParsersAndFactories()
    val resolver = CapabilitiesResolver(Options(ArcId.newForTest("test")))
    verifyStorageKey<VolatileStorageKey>(
      resolver.createStorageKey(UNSPECIFIED, ENTITY_TYPE, HANDLE_ID)
    )

    verifyStorageKey<VolatileStorageKey>(
      resolver.createStorageKey(Capabilities(Shareable(false)), ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<RamDiskStorageKey>(
      resolver.createStorageKey(Capabilities(Shareable(true)), ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<VolatileStorageKey>(
      resolver.createStorageKey(IN_MEMORY, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<DatabaseStorageKey.Memory>(
      resolver.createStorageKey(IN_MEMORY_WITH_TTLS, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<DatabaseStorageKey.Persistent>(
      resolver.createStorageKey(ON_DISK, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<DatabaseStorageKey.Persistent>(
      resolver.createStorageKey(ON_DISK_WITH_TTL, ENTITY_TYPE, HANDLE_ID)
    )
  }

  @Test
  fun createStorageKey_inMemoryCapabilitiesInMemoryFactories_success() {
    CapabilitiesResolver.registerStorageKeyFactory(VolatileStorageKey.VolatileStorageKeyFactory())
    val resolver = CapabilitiesResolver(
      Options(ArcId.newForTest("test")),
      listOf(DatabaseStorageKey.Memory.Factory())
    )

    verifyStorageKey<VolatileStorageKey>(
      resolver.createStorageKey(UNSPECIFIED, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<VolatileStorageKey>(
      resolver.createStorageKey(IN_MEMORY, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<DatabaseStorageKey.Memory>(
      resolver.createStorageKey(IN_MEMORY_WITH_TTLS, ENTITY_TYPE, HANDLE_ID)
    )
  }

  @Test
  fun createStorageKey_dbCapabilitiesInMemoryFactories_fails() {
    CapabilitiesResolver.registerStorageKeyFactory(VolatileStorageKey.VolatileStorageKeyFactory())
    val resolver = CapabilitiesResolver(
      Options(ArcId.newForTest("test")),
      listOf(DatabaseStorageKey.Memory.Factory())
    )

    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(ON_DISK, ENTITY_TYPE, HANDLE_ID)
    }
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(ON_DISK_WITH_TTL, ENTITY_TYPE, HANDLE_ID)
    }
  }

  @Test
  fun createStorageKey_inMemoryCapabilitiesInMemoryCustomFactory_success() {
    val resolver = CapabilitiesResolver(
      Options(ArcId.newForTest("test")),
      listOf(DatabaseStorageKey.Memory.Factory())
    )

    verifyStorageKey<DatabaseStorageKey.Memory>(
      resolver.createStorageKey(UNSPECIFIED, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<DatabaseStorageKey.Memory>(
      resolver.createStorageKey(IN_MEMORY, ENTITY_TYPE, HANDLE_ID)
    )
    verifyStorageKey<DatabaseStorageKey.Memory>(
      resolver.createStorageKey(IN_MEMORY_WITH_TTLS, ENTITY_TYPE, HANDLE_ID)
    )
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(ON_DISK, ENTITY_TYPE, HANDLE_ID)
    }
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(ON_DISK_WITH_TTL, ENTITY_TYPE, HANDLE_ID)
    }
  }

  @Test
  fun createStorageKey_dbCapabilitiesInCustomFactory_fails() {
    val resolver = CapabilitiesResolver(
      Options(ArcId.newForTest("test")),
      listOf(DatabaseStorageKey.Memory.Factory())
    )
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(ON_DISK, ENTITY_TYPE, HANDLE_ID)
    }
    assertFailsWith<IllegalArgumentException> {
      resolver.createStorageKey(ON_DISK_WITH_TTL, ENTITY_TYPE, HANDLE_ID)
    }
  }

  @Test
  fun createStorageKey_referenceType_success() {
    DriverAndKeyConfigurator.configureKeyParsersAndFactories()
    val resolver = CapabilitiesResolver(Options(ArcId.newForTest("test")))
    assertThat(resolver.createStorageKey(UNSPECIFIED, THING_REFERENCE_TYPE, HANDLE_ID))
      .isInstanceOf(VolatileStorageKey::class.java)
    assertThat(
      resolver.createStorageKey(Capabilities(Shareable(false)), THING_REFERENCE_TYPE, HANDLE_ID)
    ).isInstanceOf(VolatileStorageKey::class.java)
    assertThat(
      resolver.createStorageKey(Capabilities(Shareable(true)), THING_REFERENCE_TYPE, HANDLE_ID)
    ).isInstanceOf(RamDiskStorageKey::class.java)
    assertThat(resolver.createStorageKey(IN_MEMORY, THING_REFERENCE_TYPE, HANDLE_ID))
      .isInstanceOf(VolatileStorageKey::class.java)
    assertThat(resolver.createStorageKey(IN_MEMORY_WITH_TTLS, THING_REFERENCE_TYPE, HANDLE_ID))
      .isInstanceOf(DatabaseStorageKey.Memory::class.java)
    assertThat(resolver.createStorageKey(ON_DISK, THING_REFERENCE_TYPE, HANDLE_ID))
      .isInstanceOf(DatabaseStorageKey.Persistent::class.java)
    assertThat(resolver.createStorageKey(ON_DISK_WITH_TTL, THING_REFERENCE_TYPE, HANDLE_ID))
      .isInstanceOf(DatabaseStorageKey.Persistent::class.java)
  }

  @Test
  fun createStorageKey_referenceTypeIncompatibleKeys_fail() {
    val resolver = CapabilitiesResolver(Options(ArcId.newForTest("test")), listOf(FAKE_FACTORY))
    val e = assertFailsWith<IllegalStateException> {
      resolver.createStorageKey(UNSPECIFIED, ENTITY_TYPE, HANDLE_ID)
    }
    assertThat(e).hasMessageThat().isEqualTo("Backing and containers keys must use same protocol")
  }

  @Test
  fun ctor_nonUniqueFactoryProtocols_fail() {
    val e = assertFailsWith<IllegalArgumentException> {
      CapabilitiesResolver(Options(ArcId.newForTest("test")), listOf(FAKE_FACTORY, FAKE_FACTORY))
    }
    assertThat(e).hasMessageThat().isEqualTo(
      "Storage keys protocol must be unique, but was: [test, test]."
    )
  }

  companion object {
    private val ENTITY_TYPE = EntityType(
      Schema(
        setOf(SchemaName("Thing")),
        SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
        "42"
      )
    )
    private val THING_REFERENCE_TYPE = ReferenceType(ENTITY_TYPE)
    private val HANDLE_ID = "h0"

    private val UNSPECIFIED = Capabilities()
    private val IN_MEMORY = Capabilities(Persistence.IN_MEMORY)
    private val IN_MEMORY_WITH_TTLS = Capabilities(listOf(Persistence.IN_MEMORY, Ttl.Days(1)))
    private val ON_DISK = Capabilities(Persistence.ON_DISK)
    private val ON_DISK_WITH_TTL = Capabilities(listOf(Persistence.ON_DISK, Ttl.Days(1)))

    val FAKE_FACTORY = object : StorageKeyFactory(protocol = "test", capabilities = IN_MEMORY) {
      override fun create(options: StorageKeyOptions): StorageKey {
        return if (options is StorageKeyFactory.ContainerStorageKeyOptions) {
          DatabaseStorageKey.Persistent(options.location, options.entitySchema.hash)
        } else DatabaseStorageKey.Memory(options.location, options.entitySchema.hash)
      }
    }
  }
}
