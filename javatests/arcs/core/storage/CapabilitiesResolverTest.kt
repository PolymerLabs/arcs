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
import arcs.core.data.Schema
import arcs.core.storage.driver.*
import arcs.core.testutil.assertThrows
import arcs.jvm.storage.database.testutil.MockDatabaseFactory
import com.google.common.truth.Truth.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.lang.Error

/** Tests for [CapabilitiesResolver]. */
@RunWith(JUnit4::class)
class CapabilitiesResolverTest {
    @Before
    fun setUp() {
        VolatileDriverProvider(ArcId.newForTest("test"))
    }

    @After
    fun tearDown() {
        CapabilitiesResolver.reset()
        CapabilitiesResolver.defaultCreators.clear()
    }

    @Test
    fun capabilitiesResolver_createsStorageKeysDefault() {
        val options = CapabilitiesResolver.StorageKeyOptions(ArcId.newForTest("test"))
        val resolver = CapabilitiesResolver(options)
        assertThat(resolver.findStorageKeyProtocols(Capabilities.TiedToArc))
            .containsExactly(VOLATILE_DRIVER_PROTOCOL)
        assertThat(resolver.findStorageKeyProtocols(Capabilities.TiedToRuntime)).isEmpty()
        assertThat(resolver.findStorageKeyProtocols(Capabilities.Persistent)).isEmpty()
        assertThat(resolver.createStorageKey(Capabilities.TiedToArc))
            .isInstanceOf(VolatileStorageKey::class.java)
        assertThrows(IllegalArgumentException::class) {
            resolver.createStorageKey(Capabilities.TiedToRuntime)
        }
        assertThrows(IllegalArgumentException::class) {
            resolver.createStorageKey(Capabilities.Persistent)
        }
        assertThrows(IllegalArgumentException::class) {
            resolver.createStorageKey(Capabilities(setOf(
                Capabilities.Capability.TiedToArc,
                Capabilities.Capability.Persistent
            )))
        }
    }

    @Test
    fun capabilitiesResolver_createsStorageKeysCtor() {
        val options = CapabilitiesResolver.StorageKeyOptions(ArcId.newForTest("test"))
        val resolver = CapabilitiesResolver(options, mutableMapOf(
            RAMDISK_DRIVER_PROTOCOL to (Capabilities.TiedToRuntime to
                { storageKeyOptions, _ -> RamDiskStorageKey(storageKeyOptions.arcId.toString()) })
        ))
        assertThrows(IllegalArgumentException::class) {
            resolver.createStorageKey(Capabilities.TiedToArc)
        }
        assertThat(resolver.createStorageKey(Capabilities.TiedToRuntime))
            .isInstanceOf(RamDiskStorageKey::class.java)
    }

    @Test
    fun capabilitiesResolver_createsStorageKeys() {
        RamDisk.clear()
        DatabaseDriverProvider.configure(MockDatabaseFactory(), mapOf<String, Schema>()::get)
        val options = CapabilitiesResolver.StorageKeyOptions(ArcId.newForTest("test"))
        val resolver1 = CapabilitiesResolver(options)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.TiedToArc))
            .containsExactly(VOLATILE_DRIVER_PROTOCOL)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.TiedToRuntime))
            .containsExactly(RAMDISK_DRIVER_PROTOCOL)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.Persistent))
            .containsExactly(DATABASE_DRIVER_PROTOCOL)
        assertThat(resolver1.createStorageKey(Capabilities.TiedToArc))
            .isInstanceOf(VolatileStorageKey::class.java)
        assertThat(resolver1.createStorageKey(Capabilities.TiedToRuntime))
            .isInstanceOf(RamDiskStorageKey::class.java)
        assertThat(resolver1.createStorageKey(Capabilities.Persistent, "abc012"))
            .isInstanceOf(DatabaseStorageKey::class.java)

        CapabilitiesResolver.reset()
        val resolver2 = CapabilitiesResolver(options)
        assertThat(resolver2.createStorageKey(Capabilities.TiedToArc))
            .isInstanceOf(VolatileStorageKey::class.java)
        assertThrows(IllegalArgumentException::class) {
            resolver2.createStorageKey(Capabilities.TiedToRuntime)
        }
    }

    @Test
    fun capabilitiesResolver_staticCreators() {
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(1);
        assertThat(CapabilitiesResolver.registeredCreators).isEmpty()

        CapabilitiesResolver.registerDefaultKeyCreator(
            "test1",
            Capabilities.TiedToRuntime
        ) { storageKeyOptions, _ -> RamDiskStorageKey(storageKeyOptions.arcId.toString()) }
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(2);
        assertThat(CapabilitiesResolver.registeredCreators).isEmpty()

        CapabilitiesResolver.registerKeyCreator(
            "test2",
            Capabilities.Persistent
        ) { storageKeyOptions, _ -> RamDiskStorageKey(storageKeyOptions.arcId.toString()) }
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(2);
        assertThat(CapabilitiesResolver.registeredCreators).hasSize(1)

        CapabilitiesResolver.reset()
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(2);
        assertThat(CapabilitiesResolver.registeredCreators).isEmpty()
    }
}
