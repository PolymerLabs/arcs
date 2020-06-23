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
import arcs.core.data.CapabilitiesNew
import arcs.core.data.CapabilityNew.Persistence
import arcs.core.data.CapabilityNew.Ttl
import arcs.core.data.CapabilityNew.Shareable
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.ReferenceType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.storage.CapabilitiesResolverNew.Options
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [CapabilitiesResolverNew]. */
@RunWith(JUnit4::class)
class CapabilitiesResolverNewTest {
    private val entityType = EntityType(
        Schema(
            setOf(SchemaName("Thing")),
            SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
            "42"
        )
    )
    private val thingReferenceType = ReferenceType(entityType)
    private val handleId = "h0"

    private val unspecified = CapabilitiesNew()
    private val inMemory = CapabilitiesNew(listOf(Persistence.IN_MEMORY))
    private val inMemoryWithTtls = CapabilitiesNew(listOf(Persistence.IN_MEMORY, Ttl.Days(1)))
    private val onDisk = CapabilitiesNew(listOf(Persistence.ON_DISK))
    private val onDiskWithTtl = CapabilitiesNew(listOf(Persistence.ON_DISK, Ttl.Days(1)))
  
    @After
    fun tearDown() {
        CapabilitiesResolver.reset()
        CapabilitiesResolver.defaultCreators.clear()
        CapabilitiesResolverNew.reset()
    }

    fun verifyStorageKey(key: StorageKey?, expectedClass: Class<out StorageKey>) {
        assertThat(key).isInstanceOf(ReferenceModeStorageKey::class.java)
        assertThat((key as ReferenceModeStorageKey).backingKey).isInstanceOf(expectedClass)
        assertThat(key.storageKey).isInstanceOf(expectedClass)
    }

    @Test
    fun capabilitiesResolver_failsNonUniqueRegistration() {
        VolatileStorageKey.registerKeyCreator()
        assertFailsWith<IllegalArgumentException> {
            VolatileStorageKey.registerKeyCreator()
        }
    }

    @Test
    fun capabilitiesResolver_fails() {
        val resolver = CapabilitiesResolverNew(Options(ArcId.newForTest("test")))
        // Verify storage keys for none of the capabilities cannot be created.
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(unspecified, entityType, handleId)
        }
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(inMemory, entityType, handleId)
        }
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(inMemoryWithTtls, entityType, handleId)
        }
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(onDisk, entityType, handleId)
        }
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(onDiskWithTtl, entityType, handleId)
        }
    }

    @Test
    fun capabilitiesResolver_createsVolatileKeys() {
        // Register volatile storage key factory.
        VolatileStorageKey.registerKeyCreator()
        val resolver = CapabilitiesResolverNew(Options(ArcId.newForTest("test")))
        // Verify only volatile (in-memory, no ttl) storage key can be created.
        verifyStorageKey(
            resolver.createStorageKey(unspecified, entityType, handleId),
            VolatileStorageKey::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(inMemory, entityType, handleId),
            VolatileStorageKey::class.java
        )
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(inMemoryWithTtls, entityType, handleId)
        }
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(onDisk, entityType, handleId)
        }
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(onDiskWithTtl, entityType, handleId)
        }
    }

    @Test
    fun capabilitiesResolver_createsDatabaseKeys() {
        DatabaseStorageKey.registerKeyCreator()
        val resolver = CapabilitiesResolverNew(Options(ArcId.newForTest("test")))
        verifyStorageKey(
            resolver.createStorageKey(unspecified, entityType, handleId),
            DatabaseStorageKey.Memory::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(inMemory, entityType, handleId),
            DatabaseStorageKey.Memory::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(inMemoryWithTtls, entityType, handleId),
            DatabaseStorageKey.Memory::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(onDisk, entityType, handleId),
            DatabaseStorageKey.Persistent::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(onDiskWithTtl, entityType, handleId),
            DatabaseStorageKey.Persistent::class.java
        )
    }

    @Test
    fun capabilitiesResolver_createsAllKeys() {
        DriverAndKeyConfigurator.configureKeyParsers()
        val resolver = CapabilitiesResolverNew(Options(ArcId.newForTest("test")))
        verifyStorageKey(
            resolver.createStorageKey(unspecified, entityType, handleId),
            VolatileStorageKey::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(CapabilitiesNew(listOf(Shareable(false))), entityType, handleId),
            VolatileStorageKey::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(CapabilitiesNew(listOf(Shareable(true))), entityType, handleId),
            RamDiskStorageKey::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(inMemory, entityType, handleId),
            VolatileStorageKey::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(inMemoryWithTtls, entityType, handleId),
            DatabaseStorageKey.Memory::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(onDisk, entityType, handleId),
            DatabaseStorageKey.Persistent::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(onDiskWithTtl, entityType, handleId),
            DatabaseStorageKey.Persistent::class.java
        )
    }

    @Test
    fun capabilitiesResolver_createWithCustomFactories() {
        VolatileStorageKey.registerKeyCreator()
        val resolver = CapabilitiesResolverNew(
            Options(ArcId.newForTest("test")),
            listOf(DatabaseStorageKey.Memory.Factory())
        )
        verifyStorageKey(
            resolver.createStorageKey(unspecified, entityType, handleId),
            VolatileStorageKey::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(inMemory, entityType, handleId),
            VolatileStorageKey::class.java
        )
        verifyStorageKey(
            resolver.createStorageKey(inMemoryWithTtls, entityType, handleId),
            DatabaseStorageKey.Memory::class.java
        )
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(onDisk, entityType, handleId)
        }
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(onDiskWithTtl, entityType, handleId)
        }
    }
}
