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
class CapabilitiesResolverTest{
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
        assertThat(resolver.findStorageKeyProtocols(Capabilities.TiedToArc)).containsExactly("volatile")
        assertThat(resolver.findStorageKeyProtocols(Capabilities.TiedToRuntime).isEmpty()).isTrue()
        assertThat(resolver.findStorageKeyProtocols(Capabilities.Persistent).isEmpty()).isTrue()
        assertThat(resolver.createStorageKey(Capabilities.TiedToArc) is VolatileStorageKey).isTrue()
        assertThrows(IllegalStateException::class) {
            resolver.createStorageKey(Capabilities.TiedToRuntime)
        }
        assertThrows(IllegalStateException::class) {
            resolver.createStorageKey(Capabilities.Persistent)
        }
        assertThrows(IllegalStateException::class) {
            resolver.createStorageKey(Capabilities(setOf(Capabilities.Capability.TiedToArc, Capabilities.Capability.Persistent)))
        }
    }

    @Test
    fun capabilitiesResolver_createsStorageKeysCtor() {
        val options = CapabilitiesResolver.StorageKeyOptions(ArcId.newForTest("test"))
        val resolver = CapabilitiesResolver(options,
            mutableMapOf("ramdisk" to CapabilitiesResolver.CapabilitiesCreator(
                Capabilities.TiedToRuntime, { (arcId), _ -> RamDiskStorageKey(arcId.toString()) }
            ))
        )
        assertThrows(IllegalStateException::class) {
            resolver.createStorageKey(Capabilities.TiedToArc)
        }
        assertThat(resolver.createStorageKey(Capabilities.TiedToRuntime) is RamDiskStorageKey).isTrue()
    }

    @Test
    fun capabilitiesResolver_createsStorageKeys() {
        RamDisk.clear()
        DatabaseDriverProvider.configure(MockDatabaseFactory(), mapOf<String, Schema>()::get)
        val options = CapabilitiesResolver.StorageKeyOptions(ArcId.newForTest("test"))
        val resolver1 = CapabilitiesResolver(options)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.TiedToArc)).containsExactly("volatile")
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.TiedToRuntime)).containsExactly("ramdisk")
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.Persistent)).containsExactly("db")
        assertThat(resolver1.createStorageKey(Capabilities.TiedToArc) is VolatileStorageKey).isTrue()
        assertThat(resolver1.createStorageKey(Capabilities.TiedToRuntime) is RamDiskStorageKey).isTrue()
        assertThat(resolver1.createStorageKey(Capabilities.Persistent, "abc012") is DatabaseStorageKey).isTrue()

        CapabilitiesResolver.reset()
        val resolver2 = CapabilitiesResolver(options)
        assertThat(resolver2.createStorageKey(Capabilities.TiedToArc) is VolatileStorageKey).isTrue()
        assertThrows(IllegalStateException::class) {
            resolver2.createStorageKey(Capabilities.TiedToRuntime)
        }
    }

    @Test
    fun capabilitiesResolver_staticCreators() {
        assertThat(CapabilitiesResolver.defaultCreators.size).isEqualTo(1);
        assertThat(CapabilitiesResolver.registeredCreators.isEmpty()).isTrue()

        CapabilitiesResolver.registerDefaultKeyCreator(
            "test1",
            Capabilities.TiedToRuntime,
            {(arcId), _ -> RamDiskStorageKey(arcId.toString())}
        )
        assertThat(CapabilitiesResolver.defaultCreators.size).isEqualTo(2);
        assertThat(CapabilitiesResolver.registeredCreators.isEmpty()).isTrue()

        CapabilitiesResolver.registerKeyCreator(
            "test2",
            Capabilities.Persistent,
            {(arcId), _ -> RamDiskStorageKey(arcId.toString())}
        )
        assertThat(CapabilitiesResolver.defaultCreators.size).isEqualTo(2);
        assertThat(CapabilitiesResolver.registeredCreators.size).isEqualTo(1)

        CapabilitiesResolver.reset()
        assertThat(CapabilitiesResolver.defaultCreators.size).isEqualTo(2);
        assertThat(CapabilitiesResolver.registeredCreators.isEmpty()).isTrue()
    }

//    @Test
//    fun capabilitiesResolver_findsProtocolsForCapabilities() {
//        val options = CapabilitiesResolver.StorageKeyOptions(ArcId.newForTest("test"))
//        val resolver1 = CapabilitiesResolver(options)
//        assertThat(resolver1.findStorageKeyProtocols(Capabilities.TiedToArc)).containsExactly("volatile")
//        assertThat(resolver1.findStorageKeyProtocols(Capabilities.TiedToRuntime).isEmpty()).isTrue()
//        assertThat(resolver1.findStorageKeyProtocols(Capabilities.Persistent).isEmpty()).isTrue()
//
//        assertThat(CapabilitiesResolver.registeredCreators.size).isEqualTo(0)
//        RamDisk.clear()
//        assertThat(CapabilitiesResolver.registeredCreators.size).isEqualTo(1)
////        DatabaseDriverProvider.configure(MockDatabaseFactory(), mapOf<String, Schema>()::get)
//        val resolver2 = CapabilitiesResolver(options)
//        assertThat(resolver2.findStorageKeyProtocols(Capabilities.TiedToArc)).containsExactly("volatile")
//        assertThat(resolver2.createStorageKey(Capabilities.TiedToRuntime) is RamDiskStorageKey).isTrue()
//        assertThat(resolver2.findStorageKeyProtocols(Capabilities.TiedToRuntime)).containsExactly("ramdisk")
////        assertThat(resolver2.findStorageKeyProtocols(Capabilities.Persistent)).containsExactly("db")
//    }
}
