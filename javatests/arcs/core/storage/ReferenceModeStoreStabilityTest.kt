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
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.volatiles.VolatileEntry
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.testDriverFactory
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

typealias RefModeStore = ActiveStore<RefModeStoreData, RefModeStoreOp, RawEntity?>

@OptIn(ExperimentalCoroutinesApi::class)
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
  fun setUp() = runBlocking<Unit> {
    ReferenceModeStore.BLOCKING_QUEUE_TIMEOUT_MILLIS = RECEIVE_QUEUE_TIMEOUT_FOR_TEST
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
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
    RamDisk.memory.set(containerKey, VolatileEntry(singletonCrdt.data, 1))

    val store: RefModeStore = ActiveStore(
      StoreOptions(
        storageKey,
        SingletonType(EntityType(schema))
      ),
      this,
      testDriverFactory,
      ::testWriteBackProvider,
      null
    )

    val modelValue = CompletableDeferred<RefModeStoreData.Singleton>()
    val id = store.on {
      if (it is ProxyMessage.ModelUpdate<*, *, *>) {
        modelValue.complete(it.model as RefModeStoreData.Singleton)
      }
    }

    withTimeout(RECEIVE_QUEUE_TIMEOUT_FOR_TEST * 2) {
      store.onProxyMessage(ProxyMessage.SyncRequest(id))

      assertThat(modelValue.await().values).isEmpty()
      assertThat(
        RamDisk.memory.get<CrdtSingleton.Data<RawEntity>>(containerKey)?.data?.values
      ).isEmpty()
    }
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
    RamDisk.memory.set(containerKey, VolatileEntry(setCrdt.data, 1))

    val store: RefModeStore = ActiveStore(
      StoreOptions(
        storageKey,
        CollectionType(EntityType(schema))
      ),
      this,
      testDriverFactory,
      ::testWriteBackProvider,
      null
    )

    val modelValue = CompletableDeferred<RefModeStoreData.Set>()
    val id = store.on {
      if (it is ProxyMessage.ModelUpdate<*, *, *>) {
        modelValue.complete(it.model as RefModeStoreData.Set)
      }
    }

    // This shorter withTimeout is to verify that the SyncRequest handling is not blocked by
    // the timeout that is set up to resolve the pending IDs (that will not be resolved in this
    // test)
    withTimeout(RECEIVE_QUEUE_TIMEOUT_FOR_TEST / 2) {
      store.onProxyMessage(ProxyMessage.SyncRequest(id))
    }

    withTimeout(RECEIVE_QUEUE_TIMEOUT_FOR_TEST * 2) {
      assertThat(modelValue.await().values).isEmpty()
      assertThat(RamDisk.memory.get<CrdtSet.Data<RawEntity>>(containerKey)?.data?.values)
        .isEmpty()
    }
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
    RamDisk.memory.set(containerKey, VolatileEntry(setCrdt.data, 1))

    val entityCrdt = CrdtEntity(VersionMap(), RawEntity("foo_value", setOf("name"), emptySet()))
    entityCrdt.applyOperation(
      CrdtEntity.Operation.SetSingleton(
        "foo",
        VersionMap("foo" to 1),
        "name",
        CrdtEntity.ReferenceImpl("Alice".toReferencable().id)
      )
    )
    RamDisk.memory.set(
      backingKey.childKeyWithComponent("foo_value"),
      VolatileEntry(entityCrdt.data, 1)
    )

    val store: RefModeStore = ActiveStore(
      StoreOptions(
        storageKey,
        CollectionType(EntityType(schema))
      ),
      this,
      testDriverFactory,
      ::testWriteBackProvider,
      null
    )

    val modelValue = CompletableDeferred<RefModeStoreData.Set>()
    val id = store.on {
      if (it is ProxyMessage.ModelUpdate<*, *, *>) {
        modelValue.complete(it.model as RefModeStoreData.Set)
      }
    }

    // This shorter withTimeout is to verify that the SyncRequest handling is not blocked by
    // the timeout that is set up to resolve the pending IDs (that will not be resolved in this
    // test)
    withTimeout(RECEIVE_QUEUE_TIMEOUT_FOR_TEST / 2) {
      store.onProxyMessage(ProxyMessage.SyncRequest(id))
    }

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
    RamDisk.memory.set(containerKey, VolatileEntry(singletonCrdt.data, 1))

    val entityCrdt = CrdtEntity(VersionMap(), RawEntity("foo_value", setOf("name"), emptySet()))
    entityCrdt.applyOperation(
      CrdtEntity.Operation.SetSingleton(
        "foo",
        VersionMap("foo" to 1),
        "name",
        CrdtEntity.ReferenceImpl("Alice".toReferencable().id)
      )
    )
    RamDisk.memory.set(
      backingKey.childKeyWithComponent("foo_value"),
      VolatileEntry(entityCrdt.data, 1)
    )

    val store: RefModeStore = ActiveStore(
      StoreOptions(
        storageKey,
        SingletonType(EntityType(schema))
      ),
      this,
      testDriverFactory,
      ::testWriteBackProvider,
      null
    )

    val modelValue = CompletableDeferred<RefModeStoreData.Singleton>()
    val id = store.on {
      if (it is ProxyMessage.ModelUpdate<*, *, *>) {
        modelValue.complete(it.model as RefModeStoreData.Singleton)
      }
    }

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
    RamDisk.memory.set(containerKey, VolatileEntry(setCrdt.data, 1))

    val entityCrdt = CrdtEntity(VersionMap(), RawEntity("foo_value", setOf("name"), emptySet()))
    entityCrdt.applyOperation(
      CrdtEntity.Operation.SetSingleton(
        "foo",
        VersionMap("foo" to 1),
        "name",
        CrdtEntity.ReferenceImpl("Alice".toReferencable().id)
      )
    )
    RamDisk.memory.set(
      backingKey.childKeyWithComponent("foo_value"),
      VolatileEntry(entityCrdt.data, 1)
    )

    val store: RefModeStore = ActiveStore(
      StoreOptions(
        storageKey,
        CollectionType(EntityType(schema))
      ),
      this,
      testDriverFactory,
      ::testWriteBackProvider,
      null
    )

    val modelValue = CompletableDeferred<RefModeStoreData.Set>()
    val id = store.on {
      if (it is ProxyMessage.ModelUpdate<*, *, *>) {
        modelValue.complete(it.model as RefModeStoreData.Set)
      }
    }

    store.onProxyMessage(ProxyMessage.SyncRequest(id))

    assertThat(modelValue.await().values).isEmpty()
    assertThat(RamDisk.memory.get<CrdtSet.Data<RawEntity>>(containerKey)?.data?.values)
      .isEmpty()
  }

  @Test
  fun collection_backingDataArrivesAfterSyncRequest_resolves() = runBlocking<Unit> {
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
    RamDisk.memory.set(containerKey, VolatileEntry(setCrdt.data, 1))

    val store: RefModeStore = ActiveStore(
      StoreOptions(
        storageKey,
        CollectionType(EntityType(schema))
      ),
      this,
      testDriverFactory,
      ::testWriteBackProvider,
      null
    )

    val modelValue = CompletableDeferred<RefModeStoreData.Set>()
    val id = store.on {
      if (it is ProxyMessage.ModelUpdate<*, *, *>) {
        modelValue.complete(it.model as RefModeStoreData.Set)
      }
    }

    // Verify the timeout is not hit.
    withTimeout(RECEIVE_QUEUE_TIMEOUT_FOR_TEST / 2) {
      store.onProxyMessage(ProxyMessage.SyncRequest(id))

      val entityCrdt = CrdtEntity(VersionMap(), RawEntity("foo_value", setOf("name"), emptySet()))
      entityCrdt.applyOperation(
        CrdtEntity.Operation.SetSingleton(
          "foo",
          VersionMap("foo" to 1),
          "name",
          CrdtEntity.ReferenceImpl("Alice".toReferencable().id)
        )
      )
      val refmodestore = store as ReferenceModeStore
      refmodestore.backingStore.getStore(
        "foo_value",
        refmodestore.backingStoreId
      ).store.onProxyMessage(ProxyMessage.ModelUpdate(model = entityCrdt.data, id = 2))

      // Verify the sync request resolves with data.
      assertThat(modelValue.await().values.keys).containsExactly("foo_value")
    }
  }

  companion object {
    const val RECEIVE_QUEUE_TIMEOUT_FOR_TEST = 2000L
  }
}
