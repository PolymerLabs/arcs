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

import arcs.core.common.ReferenceId
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.util.toReferencable
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.MockDriver
import arcs.core.storage.testutil.MockDriverProvider
import arcs.core.storage.testutil.testDriverFactory
import arcs.core.storage.testutil.testWriteBackProvider
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class DirectStoreMuxerTest {

  private lateinit var storageKey: RamDiskStorageKey
  private lateinit var schema: Schema
  private val driverFactory = FixedDriverFactory(MockDriverProvider())

  @Before
  fun setup() = runBlockingTest {
    storageKey = RamDiskStorageKey("test")
    schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf(
          "name" to FieldType.Text,
          "age" to FieldType.Int
        ),
        collections = emptyMap()
      ),
      "abc"
    )
    DefaultDriverFactory.update(MockDriverProvider())
  }

  @Test
  fun directStoreMuxerNoRace() = runBlocking<Unit>(Dispatchers.IO) {
    DriverAndKeyConfigurator.configure(null)

    val storageKey = RamDiskStorageKey("test")

    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf(
          "field" to FieldType.Text
        ),
        collections = emptyMap()
      ),
      "abc"
    )

    var callbacks = 0

    val directStoreMuxer = DirectStoreMuxerImpl<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
      storageKey = storageKey,
      backingType = EntityType(schema),
      scope = this,
      driverFactory = testDriverFactory,
      writeBackProvider = ::testWriteBackProvider,
      devTools = null
    )

    val callbackId = directStoreMuxer.on {
      callbacks++
    }

    val vm1 = VersionMap("first" to 1)
    val value = CrdtSingleton(
      initialVersion = vm1,
      initialData = CrdtEntity.Reference.buildReference("xyz".toReferencable())
    )
    val data = CrdtEntity.Data(
      versionMap = vm1,
      singletons = mapOf(
        "field" to value
      )
    )

    // Attempt to trigger a child store setup race
    coroutineScope {
      launch { directStoreMuxer.getLocalData("a", callbackId) }
      launch {
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.ModelUpdate(data, callbackId))
        )
      }
      launch { directStoreMuxer.getLocalData("a", callbackId) }
      launch {
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.ModelUpdate(data, callbackId))
        )
      }
      launch { directStoreMuxer.getLocalData("a", callbackId) }
      launch {
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.ModelUpdate(data, callbackId))
        )
      }
    }

    val otherStore = DirectStore.create<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
      StoreOptions(
        storageKey = storageKey.childKeyWithComponent("a"),
        type = EntityType(schema)
      ),
      this,
      testDriverFactory,
      ::testWriteBackProvider,
      null
    )

    val newValue = CrdtSingleton(
      initialVersion = VersionMap("other" to 2),
      initialData = CrdtEntity.Reference.buildReference("asdfadf".toReferencable())
    )
    val newData = CrdtEntity.Data(
      versionMap = VersionMap("other" to 2),
      singletons = mapOf(
        "field" to newValue
      )
    )

    coroutineScope {
      otherStore.onProxyMessage(
        ProxyMessage.ModelUpdate(
          newData, 1
        )
      )
    }
    assertThat(callbacks).isEqualTo(1)
  }

  @Test
  fun directStoreMuxer_maintains_consistentState() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)

    val entityCrdtA = createPersonEntityCrdt("bob", 42)
    val entityCrdtB = createPersonEntityCrdt("alice", 10)

    // Initially set up two clients that are registered to the DirectStoreMuxer. These clients are
    // established outside of the coroutine scope because a reference to them is needed to confirm
    // later that they have successfully deregistered from the DirectStoreMuxer.
    val callbackId1 = directStoreMuxer.on {}
    val callbackId2 = directStoreMuxer.on {}

    // Two stores are established outside the coroutine scope because a reference to them is needed
    // to confirm later that they have successfully closed.
    val storeA = directStoreMuxer.getStore("a", callbackId1).store
    val storeB = directStoreMuxer.getStore("b", callbackId1).store

    // Simulate several clients registering to and sending/receiving messages to/from the
    // DirectStoreMuxer.
    coroutineScope {
      launch {
        directStoreMuxer.getLocalData("a", callbackId1)
        directStoreMuxer.off(callbackId1)
      }
      launch {
        directStoreMuxer.getLocalData("a", callbackId2)
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.ModelUpdate(entityCrdtA.data, callbackId2))
        )
        directStoreMuxer.off(callbackId2)
      }
      launch {
        val callbackId3 = directStoreMuxer.on {}
        directStoreMuxer.getLocalData("a", callbackId3)
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.SyncRequest(callbackId3))
        )
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("b", ProxyMessage.SyncRequest(callbackId3))
        )
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.SyncRequest(callbackId3))
        )
      }
      launch {
        val callbackId4 = directStoreMuxer.on {}
        directStoreMuxer.getLocalData("b", callbackId4)
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.SyncRequest(callbackId4))
        )
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("b", ProxyMessage.ModelUpdate(entityCrdtB.data, callbackId4))
        )
      }
      launch {
        val callbackId5 = directStoreMuxer.on {}
        directStoreMuxer.getLocalData("a", callbackId5)
        directStoreMuxer.getLocalData("b", callbackId5)

        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("b", ProxyMessage.SyncRequest(callbackId5))
        )
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.ModelUpdate(entityCrdtA.data, callbackId5))
        )
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("b", ProxyMessage.ModelUpdate(entityCrdtA.data, callbackId5))
        )
      }
      launch {
        val callbackId6 = directStoreMuxer.on {}
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.ModelUpdate(entityCrdtA.data, callbackId6))
        )
        directStoreMuxer.clearStoresCache()
      }
    }

    // Check that the stores have successfully closed.
    assertThat(storeA.closed).isTrue()
    assertThat(storeB.closed).isTrue()

    // Check that the shared mutable state in the directStoreMuxer has maintained consistent.
    assertThat(directStoreMuxer.consistentState()).isTrue()

    // Check that deregistered callbacks are no longer registered with the DirectStoreMuxer
    assertFailsWith<IllegalStateException>(
      "Callback id is not registered to the Direct Store Muxer."
    ) { directStoreMuxer.getLocalData("a", callbackId1) }

    assertFailsWith<IllegalStateException>(
      "Callback id is not registered to the Direct Store Muxer."
    ) { directStoreMuxer.getLocalData("a", callbackId2) }
  }

  @Test
  fun propagateModelUpdates_fromProxyMuxer_toDrivers() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)

    val callbackId = directStoreMuxer.on {}

    val entityCrdtA = createPersonEntityCrdt("bob", 42)

    directStoreMuxer.onProxyMessage(
      MuxedProxyMessage("a", ProxyMessage.ModelUpdate(entityCrdtA.data, callbackId))
    )

    val driverA = directStoreMuxer.getEntityDriver("a")
    val capturedA = driverA.sentData.first()
    assertThat(capturedA.toRawEntity().singletons).containsExactly(
      "name", "bob".toReferencable(),
      "age", 42.toReferencable()
    )
    assertThat(directStoreMuxer.stores.size).isEqualTo(1)

    val entityCrdtB = createPersonEntityCrdt("alice", 10)

    directStoreMuxer.onProxyMessage(
      MuxedProxyMessage("b", ProxyMessage.ModelUpdate(entityCrdtB.data, callbackId))
    )

    val driverB = directStoreMuxer.getEntityDriver("b")
    val capturedB = driverB.sentData.first()
    assertThat(capturedB.toRawEntity().singletons).containsExactly(
      "name", "alice".toReferencable(),
      "age", 10.toReferencable()
    )
    assertThat(directStoreMuxer.stores.size).isEqualTo(2)
  }

  @Test
  fun propagatesModelUpdate_fromProxyMuxer_toDriver_toOtherProxyMuxers() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)

    val job = Job(coroutineContext[Job])

    // Client that sends a model update to direct store muxer
    var callbackInvoked = false
    var callbackId1 = directStoreMuxer.on {
      callbackInvoked = true
    }

    // Client that receives a model update from direct store muxer
    val callbackId2 = directStoreMuxer.on { muxedMessage ->
      assertThat(muxedMessage.message is ProxyMessage.ModelUpdate).isTrue()
      job.complete()
    }

    // Set up store for muxId "a" and register for each client.
    val muxIdA = "a"
    directStoreMuxer.getLocalData(muxIdA, callbackId1)
    directStoreMuxer.getLocalData(muxIdA, callbackId2)

    val entityCrdtA = createPersonEntityCrdt("bob", 42)

    directStoreMuxer.onProxyMessage(
      MuxedProxyMessage(muxIdA, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackId1))
    )

    val driverA = directStoreMuxer.getEntityDriver(muxIdA)
    val capturedA = driverA.sentData.first()
    assertThat(capturedA.toRawEntity().singletons).containsExactly(
      "name", "bob".toReferencable(),
      "age", 42.toReferencable()
    )
    job.join()
    assertThat(callbackInvoked).isFalse()
  }

  @Test
  fun onlySendsModelResponse_toRequestingProxy() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)

    val job = Job(coroutineContext[Job])

    // Client that sends a sync request.
    val callbackId1 = directStoreMuxer.on { muxedMessage ->
      assertThat(muxedMessage.message is ProxyMessage.ModelUpdate).isTrue()
      job.complete()
    }

    // Other client.
    var callback2Invoked = false
    val callbackId2 = directStoreMuxer.on {
      callback2Invoked = true
    }

    // Set up store for muxId "a" and register for each client.
    val muxIdA = "a"
    directStoreMuxer.getLocalData(muxIdA, callbackId1)
    directStoreMuxer.getLocalData(muxIdA, callbackId2)

    directStoreMuxer.onProxyMessage(
      MuxedProxyMessage(muxIdA, ProxyMessage.SyncRequest(callbackId1))
    )
    job.join()
    assertThat(callback2Invoked).isFalse()
  }

  @Test
  fun unregisterSucessfully() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)

    val callbackId1 = directStoreMuxer.on {}

    val muxIdA = "a"
    val (idMapA, _) = directStoreMuxer.getStore(muxIdA, callbackId1)

    val muxIdB = "b"
    val (idMapB, _) = directStoreMuxer.getStore(muxIdB, callbackId1)

    assertThat(idMapA.size).isEqualTo(1)
    assertThat(idMapB.size).isEqualTo(1)

    directStoreMuxer.off(callbackId1)

    assertThat(idMapA.size).isEqualTo(0)
    assertThat(idMapB.size).isEqualTo(0)

    assertFailsWith<IllegalStateException>(
      "Callback id is not registered to the Direct Store Muxer."
    ) { directStoreMuxer.getLocalData("a", callbackId1) }

    assertFailsWith<IllegalStateException>(
      "Callback id is not registered to the Direct Store Muxer."
    ) { directStoreMuxer.getLocalData("b", callbackId1) }
  }

  // region Helpers

  private fun createDirectStoreMuxer(
    scope: CoroutineScope
  ): DirectStoreMuxerImpl<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity> {
    return DirectStoreMuxerImpl(
      storageKey,
      backingType = EntityType(schema),
      scope = scope,
      driverFactory = driverFactory,
      writeBackProvider = ::testWriteBackProvider,
      devTools = null
    )
  }

  private fun DirectStoreMuxer<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>.getEntityDriver(
    id: ReferenceId
  ): MockDriver<CrdtEntity.Data> =
    requireNotNull(stores[id]).store.driver as MockDriver<CrdtEntity.Data>

  private fun createPersonEntityCrdt(name: String, age: Int): CrdtEntity = CrdtEntity(
    CrdtEntity.Data(
      versionMap = VersionMap("me" to 1),
      singletons = mapOf(
        "name" to CrdtSingleton(
          initialVersion = VersionMap("me" to 1),
          initialData = CrdtEntity.Reference.buildReference(name.toReferencable())
        ),
        "age" to CrdtSingleton(
          initialVersion = VersionMap("me" to 1),
          initialData = CrdtEntity.Reference.buildReference(age.toReferencable())
        )
      )
    )
  )

  // endregion
}
