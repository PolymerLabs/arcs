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

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SingletonType
import arcs.core.data.util.toReferencable
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.VolatileEntry
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ReferenceModeStoreStabilityTest {
    @get:Rule
    val log = LogRule()

    private val backingKey = RamDiskStorageKey("backing_data")
    private val containerKey = RamDiskStorageKey("container")
    private val storageKey = ReferenceModeStorageKey(backingKey, containerKey)
    private val schema = Schema(
        emptySet(),
        SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
        "abc"
    )

    @Before
    fun setUp() {
        ReferenceModeStore.BLOCKING_QUEUE_TIMEOUT_MILLIS = 2000
        RamDisk.clear()
        RamDiskDriverProvider()
    }

    @Test
    fun singleton_syncRequest_missingBackingData_timesOutAnd_resolvesAsEmpty() = runBlocking {
        val singletonCrdt = CrdtSingleton<Reference>()
        singletonCrdt.applyOperation(
            CrdtSingleton.Operation.Update(
                "foo",
                VersionMap("foo" to 1),
                Reference(
                    "foo_value",
                    backingKey,
                    VersionMap("foo" to 1)
                )
            )
        )
        RamDisk.memory[containerKey] = VolatileEntry(singletonCrdt.data, 1)

        val store = Store(
            StoreOptions<RefModeStoreData, RefModeStoreOp, RawEntity?>(
                storageKey,
                SingletonType(EntityType(schema)),
                StorageMode.ReferenceMode
            )
        ).activate()

        val modelValue = CompletableDeferred<RefModeStoreData.Singleton>()
        val id = store.on(
            ProxyCallback {
                if (it is ProxyMessage.ModelUpdate<*, *, *>) {
                    modelValue.complete(it.model as RefModeStoreData.Singleton)
                }
            }
        )

        store.onProxyMessage(ProxyMessage.SyncRequest(id))

        assertThat(modelValue.await().values).isEmpty()
        assertThat(RamDisk.memory.get<CrdtSingleton.Data<RawEntity>>(containerKey)?.data?.values)
            .isEmpty()
    }

    @Test
    fun collection_syncRequest_missingBackingData_timesOutAnd_resolvesAsEmpty() = runBlocking {
        val setCrdt = CrdtSet<Reference>()
        setCrdt.applyOperation(
            CrdtSet.Operation.Add(
                "foo",
                VersionMap("foo" to 1),
                Reference(
                    "foo_value",
                    backingKey,
                    VersionMap("foo" to 1)
                )
            )
        )
        RamDisk.memory[containerKey] = VolatileEntry(setCrdt.data, 1)

        val store = Store(
            StoreOptions<RefModeStoreData, RefModeStoreOp, RawEntity?>(
                storageKey,
                CollectionType(EntityType(schema)),
                StorageMode.ReferenceMode
            )
        ).activate()

        val modelValue = CompletableDeferred<RefModeStoreData.Set>()
        val id = store.on(
            ProxyCallback {
                if (it is ProxyMessage.ModelUpdate<*, *, *>) {
                    modelValue.complete(it.model as RefModeStoreData.Set)
                }
            }
        )

        store.onProxyMessage(ProxyMessage.SyncRequest(id))

        assertThat(modelValue.await().values).isEmpty()
        assertThat(RamDisk.memory.get<CrdtSet.Data<RawEntity>>(containerKey)?.data?.values)
            .isEmpty()
    }

    @Test
    fun collection_partiallyMissingBackingData_timesOutAnd_resolvesAsEmpty() = runBlocking {
        val setCrdt = CrdtSet<Reference>()
        setCrdt.applyOperation(
            CrdtSet.Operation.Add(
                "foo",
                VersionMap("foo" to 1),
                Reference(
                    "foo_value",
                    backingKey,
                    VersionMap("foo" to 1)
                )
            )
        )
        setCrdt.applyOperation(
            CrdtSet.Operation.Add(
                "foo",
                VersionMap("foo" to 2),
                Reference(
                    "foo_value_2",
                    backingKey,
                    VersionMap("foo" to 2)
                )
            )
        )
        RamDisk.memory[containerKey] = VolatileEntry(setCrdt.data, 1)

        val entityCrdt = CrdtEntity(VersionMap(), RawEntity("foo_value", setOf("name"), emptySet()))
        entityCrdt.applyOperation(
            CrdtEntity.Operation.SetSingleton(
                "foo",
                VersionMap("foo" to 1),
                "name",
                CrdtEntity.ReferenceImpl("Alice".toReferencable().id)
            )
        )
        RamDisk.memory[backingKey.childKeyWithComponent("foo_value")] =
            VolatileEntry(entityCrdt.data, 1)

        val store = Store(
            StoreOptions<RefModeStoreData, RefModeStoreOp, RawEntity?>(
                storageKey,
                CollectionType(EntityType(schema)),
                StorageMode.ReferenceMode
            )
        ).activate()

        val modelValue = CompletableDeferred<RefModeStoreData.Set>()
        val id = store.on(
            ProxyCallback {
                if (it is ProxyMessage.ModelUpdate<*, *, *>) {
                    modelValue.complete(it.model as RefModeStoreData.Set)
                }
            }
        )

        store.onProxyMessage(ProxyMessage.SyncRequest(id))

        assertThat(modelValue.await().values).isEmpty()
        assertThat(RamDisk.memory.get<CrdtSet.Data<RawEntity>>(containerKey)?.data?.values)
            .isEmpty()
    }

    @Test
    fun singleton_existingButOldBackingData_timesOutAnd_resolvesAsEmpty() = runBlocking {
        val singletonCrdt = CrdtSingleton<Reference>()
        singletonCrdt.applyOperation(
            CrdtSingleton.Operation.Update(
                "foo",
                VersionMap("foo" to 1),
                Reference(
                    "foo_value",
                    backingKey,
                    VersionMap("foo" to 1)
                )
            )
        )
        singletonCrdt.applyOperation(
            CrdtSingleton.Operation.Update(
                "foo",
                VersionMap("foo" to 2),
                Reference(
                    "foo_value",
                    backingKey,
                    VersionMap("foo" to 2)
                )
            )
        )
        RamDisk.memory[containerKey] = VolatileEntry(singletonCrdt.data, 1)

        val entityCrdt = CrdtEntity(VersionMap(), RawEntity("foo_value", setOf("name"), emptySet()))
        entityCrdt.applyOperation(
            CrdtEntity.Operation.SetSingleton(
                "foo",
                VersionMap("foo" to 1),
                "name",
                CrdtEntity.ReferenceImpl("Alice".toReferencable().id)
            )
        )
        RamDisk.memory[backingKey.childKeyWithComponent("foo_value")] =
            VolatileEntry(entityCrdt.data, 1)

        val store = Store(
            StoreOptions<RefModeStoreData, RefModeStoreOp, RawEntity?>(
                storageKey,
                SingletonType(EntityType(schema)),
                StorageMode.ReferenceMode
            )
        ).activate()

        val modelValue = CompletableDeferred<RefModeStoreData.Singleton>()
        val id = store.on(
            ProxyCallback {
                if (it is ProxyMessage.ModelUpdate<*, *, *>) {
                    modelValue.complete(it.model as RefModeStoreData.Singleton)
                }
            }
        )

        store.onProxyMessage(ProxyMessage.SyncRequest(id))

        assertThat(modelValue.await().values).isEmpty()
        assertThat(RamDisk.memory.get<CrdtSingleton.Data<RawEntity>>(containerKey)?.data?.values)
            .isEmpty()
    }

    @Test
    fun collection_existingButOldBackingData_timesOutAnd_resolvesAsEmpty() = runBlocking {
        val setCrdt = CrdtSet<Reference>()
        setCrdt.applyOperation(
            CrdtSet.Operation.Add(
                "foo",
                VersionMap("foo" to 1),
                Reference(
                    "foo_value",
                    backingKey,
                    VersionMap("foo" to 1)
                )
            )
        )
        setCrdt.applyOperation(
            CrdtSet.Operation.Add(
                "foo",
                VersionMap("foo" to 2),
                Reference(
                    "foo_value",
                    backingKey,
                    VersionMap("foo" to 2)
                )
            )
        )
        RamDisk.memory[containerKey] = VolatileEntry(setCrdt.data, 1)

        val entityCrdt = CrdtEntity(VersionMap(), RawEntity("foo_value", setOf("name"), emptySet()))
        entityCrdt.applyOperation(
            CrdtEntity.Operation.SetSingleton(
                "foo",
                VersionMap("foo" to 1),
                "name",
                CrdtEntity.ReferenceImpl("Alice".toReferencable().id)
            )
        )
        RamDisk.memory[backingKey.childKeyWithComponent("foo_value")] =
            VolatileEntry(entityCrdt.data, 1)

        val store = Store(
            StoreOptions<RefModeStoreData, RefModeStoreOp, RawEntity?>(
                storageKey,
                CollectionType(EntityType(schema)),
                StorageMode.ReferenceMode
            )
        ).activate()

        val modelValue = CompletableDeferred<RefModeStoreData.Set>()
        val id = store.on(
            ProxyCallback {
                if (it is ProxyMessage.ModelUpdate<*, *, *>) {
                    modelValue.complete(it.model as RefModeStoreData.Set)
                }
            }
        )

        store.onProxyMessage(ProxyMessage.SyncRequest(id))

        assertThat(modelValue.await().values).isEmpty()
        assertThat(RamDisk.memory.get<CrdtSet.Data<RawEntity>>(containerKey)?.data?.values)
            .isEmpty()
    }
}
