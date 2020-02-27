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
<<<<<<< HEAD
import arcs.core.data.Capabilities
import arcs.core.data.Schema
import arcs.core.storage.driver.DATABASE_DRIVER_PROTOCOL
import arcs.core.storage.driver.DatabaseDriverProvider
import arcs.core.storage.driver.DatabaseStorageKey
import arcs.core.storage.driver.RAMDISK_DRIVER_PROTOCOL
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.driver.VOLATILE_DRIVER_PROTOCOL
import arcs.core.storage.driver.VolatileDriverProvider
import arcs.core.storage.driver.VolatileStorageKey
=======
import arcs.core.data.*
import arcs.core.storage.driver.*
import arcs.core.storage.referencemode.ReferenceModeStorageKey
>>>>>>> CapabilitiesResolver (kt) to support ReferenceModeStorageKeys
import arcs.core.testutil.assertThrows
import arcs.jvm.storage.database.testutil.MockDatabaseManager
import com.google.common.truth.Truth.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CapabilitiesResolver]. */
@RunWith(JUnit4::class)
class CapabilitiesResolverTest {
    private val thingSchema = Schema(
        listOf(SchemaName("Thing")),
        SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
        "42"
    )
    private val handleId = "h0"

    @Before
    fun setUp() {
        VolatileDriverProvider(ArcId.newForTest("test"))
    }

    @After
    fun tearDown() {
        CapabilitiesResolver.reset()
        CapabilitiesResolver.defaultCreators.clear()
    }

    fun verifyStorageKey(key: StorageKey?, expectedClass: Class<out StorageKey>) {
        assertThat(key).isInstanceOf(ReferenceModeStorageKey::class.java)
        assertThat((key as ReferenceModeStorageKey).backingKey).isInstanceOf(expectedClass)
        assertThat(key.storageKey).isInstanceOf(expectedClass)
    }

    @Test
    fun capabilitiesResolver_createsStorageKeysDefault() {
        val options = CapabilitiesResolver.CapabilitiesResolverOptions(ArcId.newForTest("test"))
        val resolver = CapabilitiesResolver(options)
        assertThat(resolver.findStorageKeyProtocols(Capabilities.TiedToArc))
            .containsExactly(VOLATILE_DRIVER_PROTOCOL)
        assertThat(resolver.findStorageKeyProtocols(Capabilities.TiedToRuntime)).isEmpty()
        assertThat(resolver.findStorageKeyProtocols(Capabilities.Persistent)).isEmpty()
        verifyStorageKey(resolver.createStorageKey(Capabilities.TiedToArc, thingSchema, handleId), VolatileStorageKey::class.java)
        assertThrows(IllegalArgumentException::class) {
            resolver.createStorageKey(Capabilities.TiedToRuntime, thingSchema, handleId)
        }
        assertThrows(IllegalArgumentException::class) {
            resolver.createStorageKey(Capabilities.Persistent, thingSchema, handleId)
        }
        assertThrows(IllegalArgumentException::class) {
            resolver.createStorageKey(Capabilities(setOf(
                Capabilities.Capability.TiedToArc,
                Capabilities.Capability.Persistent
            )), thingSchema, handleId)
        }
    }

    @Test
    fun capabilitiesResolver_createsStorageKeysCtor() {
        val options = CapabilitiesResolver.CapabilitiesResolverOptions(ArcId.newForTest("test"))
        val ramDiskCreator: Pair<Capabilities, StorageKeyCreator> = Capabilities.TiedToRuntime to
            { storageKeyOptions -> RamDiskStorageKey(storageKeyOptions.arcId.toString()) }
        val resolver = CapabilitiesResolver(
            options,
            mutableMapOf(RAMDISK_DRIVER_PROTOCOL to ramDiskCreator)
        )
        assertThrows(IllegalArgumentException::class) {
            resolver.createStorageKey(Capabilities.TiedToArc, thingSchema, handleId)
        }
        verifyStorageKey((resolver.createStorageKey(Capabilities.TiedToRuntime, thingSchema, handleId)), RamDiskStorageKey::class.java)
    }

    @Test
    fun capabilitiesResolver_createsStorageKeys() {
        RamDisk.clear()
        DatabaseDriverProvider.configure(MockDatabaseManager(), mapOf<String, Schema>()::get)
        val options = CapabilitiesResolver.CapabilitiesResolverOptions(ArcId.newForTest("test"))
        val resolver1 = CapabilitiesResolver(options)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.TiedToArc))
            .containsExactly(VOLATILE_DRIVER_PROTOCOL)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.TiedToRuntime))
            .containsExactly(RAMDISK_DRIVER_PROTOCOL)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.Persistent))
            .containsExactly(DATABASE_DRIVER_PROTOCOL)
<<<<<<< HEAD
        assertThat(resolver1.createStorageKey(Capabilities.TiedToArc))
            .isInstanceOf(VolatileStorageKey::class.java)
        assertThat(resolver1.createStorageKey(Capabilities.TiedToRuntime))
            .isInstanceOf(RamDiskStorageKey::class.java)
        assertThat(resolver1.createStorageKey(Capabilities.Persistent, "abc012"))
            .isInstanceOf(DatabaseStorageKey.Persistent::class.java)
=======
        verifyStorageKey(resolver1.createStorageKey(Capabilities.TiedToArc, thingSchema, handleId), VolatileStorageKey::class.java)
        verifyStorageKey(resolver1.createStorageKey(Capabilities.TiedToRuntime, thingSchema, handleId), RamDiskStorageKey::class.java)
        verifyStorageKey(resolver1.createStorageKey(Capabilities.Persistent, thingSchema, handleId), DatabaseStorageKey::class.java)
>>>>>>> CapabilitiesResolver (kt) to support ReferenceModeStorageKeys

        CapabilitiesResolver.reset()
        val resolver2 = CapabilitiesResolver(options)
        verifyStorageKey(resolver2.createStorageKey(Capabilities.TiedToArc, thingSchema, handleId), VolatileStorageKey::class.java)
        assertThrows(IllegalArgumentException::class) {
            resolver2.createStorageKey(Capabilities.TiedToRuntime, thingSchema, handleId)
        }
    }

    @Test
    fun capabilitiesResolver_staticCreators() {
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(1);
        assertThat(CapabilitiesResolver.registeredCreators).isEmpty()

        CapabilitiesResolver.registerDefaultKeyCreator(
            "test1",
            Capabilities.TiedToRuntime
        ) { storageKeyOptions -> RamDiskStorageKey(storageKeyOptions.arcId.toString()) }
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(2);
        assertThat(CapabilitiesResolver.registeredCreators).isEmpty()

        CapabilitiesResolver.registerKeyCreator(
            "test2",
            Capabilities.Persistent
        ) { storageKeyOptions -> RamDiskStorageKey(storageKeyOptions.arcId.toString()) }
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(2);
        assertThat(CapabilitiesResolver.registeredCreators).hasSize(1)

        CapabilitiesResolver.reset()
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(2);
        assertThat(CapabilitiesResolver.registeredCreators).isEmpty()
    }
}
