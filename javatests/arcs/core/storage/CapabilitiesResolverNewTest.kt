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

    private inline fun <reified T : StorageKey> verifyStorageKey(key: StorageKey) {
        assertThat(key).isInstanceOf(ReferenceModeStorageKey::class.java)
        assertThat((key as ReferenceModeStorageKey).backingKey is T).isTrue()
        assertThat(key.storageKey is T).isTrue()
    }

    @Test
    fun capabilitiesResolver_failsNonUniqueRegistration() {
        VolatileStorageKey.registerKeyCreator()
        assertFailsWith<IllegalArgumentException> {
            VolatileStorageKey.registerKeyCreator()
        }
    }

    @Test
    fun capabilitiesResolver_createStorageKey_failsUnsupported() {
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
        verifyStorageKey<VolatileStorageKey>(
            resolver.createStorageKey(unspecified, entityType, handleId)
        )
        verifyStorageKey<VolatileStorageKey>(
            resolver.createStorageKey(inMemory, entityType, handleId)
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
        verifyStorageKey<DatabaseStorageKey.Memory>(
            resolver.createStorageKey(unspecified, entityType, handleId)
        )
        verifyStorageKey<DatabaseStorageKey.Memory>(
            resolver.createStorageKey(inMemory, entityType, handleId)
        )
        verifyStorageKey<DatabaseStorageKey.Memory>(
            resolver.createStorageKey(inMemoryWithTtls, entityType, handleId)
        )
        verifyStorageKey<DatabaseStorageKey.Persistent>(
            resolver.createStorageKey(onDisk, entityType, handleId)
        )
        verifyStorageKey<DatabaseStorageKey.Persistent>(
            resolver.createStorageKey(onDiskWithTtl, entityType, handleId)
        )
    }

    @Test
    fun capabilitiesResolver_createsAllKeys() {
        DriverAndKeyConfigurator.configureKeyParsers()
        val resolver = CapabilitiesResolverNew(Options(ArcId.newForTest("test")))
        verifyStorageKey<VolatileStorageKey>(
            resolver.createStorageKey(unspecified, entityType, handleId)
        )
        verifyStorageKey<VolatileStorageKey>(
            resolver.createStorageKey(CapabilitiesNew(listOf(Shareable(false))), entityType, handleId)
        )
        verifyStorageKey<RamDiskStorageKey>(
            resolver.createStorageKey(CapabilitiesNew(listOf(Shareable(true))), entityType, handleId)
        )
        verifyStorageKey<VolatileStorageKey>(
            resolver.createStorageKey(inMemory, entityType, handleId)
        )
        verifyStorageKey<DatabaseStorageKey.Memory>(
            resolver.createStorageKey(inMemoryWithTtls, entityType, handleId)
        )
        verifyStorageKey<DatabaseStorageKey.Persistent>(
            resolver.createStorageKey(onDisk, entityType, handleId)
        )
        verifyStorageKey<DatabaseStorageKey.Persistent>(
            resolver.createStorageKey(onDiskWithTtl, entityType, handleId)
        )
    }

    @Test
    fun capabilitiesResolver_createWithCustomFactories() {
        VolatileStorageKey.registerKeyCreator()
        val resolver = CapabilitiesResolverNew(
            Options(ArcId.newForTest("test")),
            listOf(DatabaseStorageKey.Memory.Factory())
        )
        verifyStorageKey<VolatileStorageKey>(
            resolver.createStorageKey(unspecified, entityType, handleId)
        )
        verifyStorageKey<VolatileStorageKey>(
            resolver.createStorageKey(inMemory, entityType, handleId)
        )
        verifyStorageKey<DatabaseStorageKey.Memory>(
            resolver.createStorageKey(inMemoryWithTtls, entityType, handleId)
        )
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(onDisk, entityType, handleId)
        }
        assertFailsWith<IllegalStateException> {
            resolver.createStorageKey(onDiskWithTtl, entityType, handleId)
        }
    }
}
