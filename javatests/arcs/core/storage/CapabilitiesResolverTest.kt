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
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.keys.DATABASE_DRIVER_PROTOCOL
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.MEMORY_DATABASE_DRIVER_PROTOCOL
import arcs.core.storage.keys.RAMDISK_DRIVER_PROTOCOL
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VOLATILE_DRIVER_PROTOCOL
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CapabilitiesResolver]. */
@RunWith(JUnit4::class)
class CapabilitiesResolverTest {
    private val thingEntityType = EntityType(
        Schema(
            setOf(SchemaName("Thing")),
            SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
            "42"
        )
    )
    private val thingReferenceType = ReferenceType(thingEntityType)
    private val handleId = "h0"

    @Before
    fun setUp() {
        VolatileStorageKey.registerKeyCreator()
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
        assertThat(resolver.findStorageKeyProtocols(Capabilities.Empty))
            .containsExactly(VOLATILE_DRIVER_PROTOCOL)
        assertThat(resolver.findStorageKeyProtocols(Capabilities.TiedToRuntime)).isEmpty()
        assertThat(resolver.findStorageKeyProtocols(Capabilities.Persistent)).isEmpty()
        verifyStorageKey(
            resolver.createStorageKey(Capabilities.TiedToArc, thingEntityType, handleId),
            VolatileStorageKey::class.java
        )
        assertThat(resolver.createStorageKey(Capabilities.TiedToArc, thingReferenceType, handleId))
            .isInstanceOf(VolatileStorageKey::class.java)
        verifyStorageKey(
            resolver.createStorageKey(Capabilities.Empty, thingEntityType, handleId),
            VolatileStorageKey::class.java
        )
        assertThat(resolver.createStorageKey(Capabilities.Empty, thingReferenceType, handleId))
            .isInstanceOf(VolatileStorageKey::class.java)
        assertFailsWith<IllegalArgumentException> {
            resolver.createStorageKey(Capabilities.TiedToRuntime, thingEntityType, handleId)
        }
        assertFailsWith<IllegalArgumentException> {
            resolver.createStorageKey(Capabilities.TiedToRuntime, thingReferenceType, handleId)
        }
        assertFailsWith<IllegalArgumentException> {
            resolver.createStorageKey(Capabilities.Persistent, thingEntityType, handleId)
        }
        assertFailsWith<IllegalArgumentException> {
            resolver.createStorageKey(Capabilities.Persistent, thingReferenceType, handleId)
        }
        assertFailsWith<IllegalArgumentException> {
            resolver.createStorageKey(
                Capabilities(setOf(
                    Capabilities.Capability.TiedToArc,
                    Capabilities.Capability.Persistent
                )),
                thingEntityType,
                handleId
            )
        }
        assertFailsWith<IllegalArgumentException> {
            resolver.createStorageKey(
                Capabilities(setOf(
                    Capabilities.Capability.TiedToArc,
                    Capabilities.Capability.Persistent
                )),
                thingReferenceType,
                handleId
            )
        }
    }

    @Test
    fun capabilitiesResolver_createsStorageKeysCtor() {
        val options = CapabilitiesResolver.CapabilitiesResolverOptions(ArcId.newForTest("test"))
        val resolver = CapabilitiesResolver(
            options,
            mutableListOf(CapabilitiesResolver.StorageKeyCreatorInfo(
                RAMDISK_DRIVER_PROTOCOL,
                Capabilities.TiedToRuntime,
                { storageKeyOptions -> RamDiskStorageKey(storageKeyOptions.arcId.toString()) }
            ))
        )
        assertFailsWith<IllegalArgumentException> {
            resolver.createStorageKey(Capabilities.TiedToArc, thingEntityType, handleId)
        }
        assertFailsWith<IllegalArgumentException> {
            resolver.createStorageKey(Capabilities.TiedToArc, thingReferenceType, handleId)
        }
        assertFailsWith<IllegalArgumentException> {
            resolver.createStorageKey(Capabilities.Empty, thingEntityType, handleId)
        }
        assertFailsWith<IllegalArgumentException> {
            resolver.createStorageKey(Capabilities.Empty, thingReferenceType, handleId)
        }
        verifyStorageKey(
            resolver.createStorageKey(Capabilities.TiedToRuntime, thingEntityType, handleId),
            RamDiskStorageKey::class.java
        )
        assertThat(resolver.createStorageKey(Capabilities.TiedToRuntime, thingReferenceType, handleId))
            .isInstanceOf(RamDiskStorageKey::class.java)
    }

    @Test
    fun capabilitiesResolver_createsStorageKeys() {
        RamDiskStorageKey.registerKeyCreator()
        DatabaseStorageKey.registerKeyCreator()
        val options =
            CapabilitiesResolver.CapabilitiesResolverOptions(ArcId.newForTest("test"))
        val resolver1 = CapabilitiesResolver(options)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.TiedToArc))
            .containsExactly(VOLATILE_DRIVER_PROTOCOL)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.Empty))
            .containsExactly(VOLATILE_DRIVER_PROTOCOL)

        assertThat(resolver1.findStorageKeyProtocols(Capabilities.TiedToRuntime))
            .containsExactly(RAMDISK_DRIVER_PROTOCOL)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.Persistent))
            .containsExactly(DATABASE_DRIVER_PROTOCOL)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.PersistentQueryable))
            .containsExactly(DATABASE_DRIVER_PROTOCOL)
        assertThat(resolver1.findStorageKeyProtocols(Capabilities.Queryable))
            .containsExactly(MEMORY_DATABASE_DRIVER_PROTOCOL)

        verifyStorageKey(
            resolver1.createStorageKey(Capabilities.TiedToArc, thingEntityType, handleId),
            VolatileStorageKey::class.java
        )
        assertThat(resolver1.createStorageKey(Capabilities.TiedToArc, thingReferenceType, handleId))
            .isInstanceOf(VolatileStorageKey::class.java)
        verifyStorageKey(
            resolver1.createStorageKey(Capabilities.Empty, thingEntityType, handleId),
            VolatileStorageKey::class.java
        )
        assertThat(resolver1.createStorageKey(Capabilities.Empty, thingReferenceType, handleId))
            .isInstanceOf(VolatileStorageKey::class.java)
        val ramdiskKey =
            resolver1.createStorageKey(Capabilities.TiedToRuntime, thingEntityType, handleId)
        verifyStorageKey(ramdiskKey, RamDiskStorageKey::class.java)
        assertThat(ramdiskKey).isEqualTo(
            resolver1.createStorageKey(
                Capabilities.TiedToRuntime,
                thingEntityType,
                handleId
            )
        )
        val ramdiskRefKey =
            resolver1.createStorageKey(Capabilities.TiedToRuntime, thingReferenceType, handleId)
        assertThat(ramdiskRefKey).isInstanceOf(RamDiskStorageKey::class.java)
        assertThat(ramdiskRefKey).isEqualTo(
            resolver1.createStorageKey(
                Capabilities.TiedToRuntime,
                thingReferenceType,
                handleId
            )
        )

        val persistentKey =
            resolver1.createStorageKey(Capabilities.Persistent, thingEntityType, handleId)
        verifyStorageKey(persistentKey, DatabaseStorageKey::class.java)
        assertThat(persistentKey).isEqualTo(
            resolver1.createStorageKey(
                Capabilities.Persistent,
                thingEntityType,
                handleId
            )
        )
        val persistentRefKey =
            resolver1.createStorageKey(Capabilities.Persistent, thingReferenceType, handleId)
        assertThat(persistentRefKey).isInstanceOf(DatabaseStorageKey::class.java)
        assertThat(persistentRefKey).isEqualTo(
            resolver1.createStorageKey(Capabilities.Persistent, thingReferenceType, handleId)
        )

        CapabilitiesResolver.reset()
        val resolver2 = CapabilitiesResolver(options)
        val volatileKey =
            resolver2.createStorageKey(Capabilities.TiedToArc, thingEntityType, handleId)
        verifyStorageKey(volatileKey, VolatileStorageKey::class.java)
        assertThat(volatileKey).isEqualTo(
            resolver2.createStorageKey(
                Capabilities.TiedToArc,
                thingEntityType,
                handleId
            )
        )
        val volatileRefKey =
            resolver2.createStorageKey(Capabilities.TiedToArc, thingReferenceType, handleId)
        assertThat(volatileRefKey).isInstanceOf(VolatileStorageKey::class.java)
        assertThat(volatileRefKey).isEqualTo(
            resolver2.createStorageKey(Capabilities.TiedToArc, thingReferenceType, handleId)
        )
        assertFailsWith<IllegalArgumentException> {
            resolver2.createStorageKey(Capabilities.TiedToRuntime, thingEntityType, handleId)
        }
        assertFailsWith<IllegalArgumentException> {
            resolver2.createStorageKey(Capabilities.TiedToRuntime, thingReferenceType, handleId)
        }
    }

    @Test
    fun capabilitiesResolver_staticCreators() {
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(2)
        assertThat(CapabilitiesResolver.registeredCreators).isEmpty()

        CapabilitiesResolver.registerDefaultKeyCreator(
            "test1",
            Capabilities.TiedToRuntime
        ) { storageKeyOptions -> RamDiskStorageKey(storageKeyOptions.arcId.toString()) }
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(3);
        assertThat(CapabilitiesResolver.registeredCreators).isEmpty()

        CapabilitiesResolver.registerKeyCreator(
            "test2",
            Capabilities.Persistent
        ) { storageKeyOptions -> RamDiskStorageKey(storageKeyOptions.arcId.toString()) }
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(3);
        assertThat(CapabilitiesResolver.registeredCreators).hasSize(1)

        CapabilitiesResolver.reset()
        assertThat(CapabilitiesResolver.defaultCreators).hasSize(3);
        assertThat(CapabilitiesResolver.registeredCreators).isEmpty()
    }
}
