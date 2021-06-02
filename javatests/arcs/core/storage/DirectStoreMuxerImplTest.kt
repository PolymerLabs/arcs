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
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.MockDriver
import arcs.core.storage.testutil.MockDriverProvider
import arcs.core.storage.testutil.testDriverFactory
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.core.util.Time
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import arcs.flags.testing.ParameterizedBuildFlags
import arcs.jvm.util.JvmTime
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
@OptIn(ExperimentalCoroutinesApi::class)
class DirectStoreMuxerImplTest(parameters: ParameterizedBuildFlags) {

  private val entityCrdtA = createPersonEntityCrdt("bob", 42)
  private val entityCrdtB = createPersonEntityCrdt("alice", 10)

  @get:Rule val rule = BuildFlagsRule.parameterized(parameters)

  @Before
  fun setup() = runBlockingTest {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
    DefaultDriverFactory.update(MockDriverProvider())
  }

  @Test
  fun directStoreMuxer_noRace() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)
    val callbackToken = directStoreMuxer.on {}

    // Attempt to trigger a child store setup race
    coroutineScope {
      launch { directStoreMuxer.getLocalData(MUX_ID_A, callbackToken) }
      launch {
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_A, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackToken))
        )
      }
      launch { directStoreMuxer.getLocalData(MUX_ID_A, callbackToken) }
      launch {
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_A, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackToken))
        )
      }
      launch { directStoreMuxer.getLocalData(MUX_ID_A, callbackToken) }
      launch {
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_A, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackToken))
        )
      }
    }

    assertThat(directStoreMuxer.getLocalData(MUX_ID_A, callbackToken)).isEqualTo(entityCrdtA.data)
  }

  @Test
  fun directStoreMuxer_updateFromStore_isCalledBack() = runBlockingTest {
    var callbacks = 0
    val directStoreMuxer = createDirectStoreMuxer(this, testDriverFactory)
    val callbackToken = directStoreMuxer.on {
      callbacks++
    }
    directStoreMuxer.onProxyMessage(
      MuxedProxyMessage(MUX_ID_A, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackToken))
    )
    val otherStore = DirectStore.create<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
      StoreOptions(
        storageKey = STORAGE_KEY.newKeyWithComponent(MUX_ID_A),
        type = EntityType(SCHEMA)
      ),
      this,
      testDriverFactory,
      ::testWriteBackProvider,
      null
    )

    otherStore.onProxyMessage(ProxyMessage.ModelUpdate(createPersonEntityCrdt("Bob", 6, 2).data, 1))

    assertThat(callbacks).isEqualTo(1)
  }

  @Test
  fun directStoreMuxer_maintains_consistentState() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)

    // Initially set up two clients that are registered to the DirectStoreMuxer. These clients are
    // established outside of the coroutine scope because a reference to them is needed to confirm
    // later that they have successfully deregistered from the DirectStoreMuxer.
    val callbackToken1 = directStoreMuxer.on {}
    val callbackToken2 = directStoreMuxer.on {}

    // Two stores are established outside the coroutine scope because a reference to them is needed
    // to confirm later that they have successfully closed.
    val storeA = directStoreMuxer.getStore(MUX_ID_A, callbackToken1).store
    val storeB = directStoreMuxer.getStore(MUX_ID_B, callbackToken1).store

    // Simulate several clients registering to and sending/receiving messages to/from the
    // DirectStoreMuxer.
    coroutineScope {
      launch {
        directStoreMuxer.getLocalData(MUX_ID_A, callbackToken1)
        directStoreMuxer.off(callbackToken1)
      }
      launch {
        directStoreMuxer.getLocalData(MUX_ID_A, callbackToken2)
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_A, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackToken2))
        )
        directStoreMuxer.off(callbackToken2)
      }
      launch {
        val callbackToken3 = directStoreMuxer.on {}
        directStoreMuxer.getLocalData(MUX_ID_A, callbackToken3)
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_A, ProxyMessage.SyncRequest(callbackToken3))
        )
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_B, ProxyMessage.SyncRequest(callbackToken3))
        )
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_A, ProxyMessage.SyncRequest(callbackToken3))
        )
      }
      launch {
        val callbackToken4 = directStoreMuxer.on {}
        directStoreMuxer.getLocalData(MUX_ID_B, callbackToken4)
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_A, ProxyMessage.SyncRequest(callbackToken4))
        )
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_B, ProxyMessage.ModelUpdate(entityCrdtB.data, callbackToken4))
        )
      }
      launch {
        val callbackToken5 = directStoreMuxer.on {}
        directStoreMuxer.getLocalData(MUX_ID_A, callbackToken5)
        directStoreMuxer.getLocalData(MUX_ID_B, callbackToken5)

        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_B, ProxyMessage.SyncRequest(callbackToken5))
        )
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_A, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackToken5))
        )
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_B, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackToken5))
        )
      }
      launch {
        val callbackToken6 = directStoreMuxer.on {}
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage(MUX_ID_A, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackToken6))
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
    ) { directStoreMuxer.getLocalData(MUX_ID_A, callbackToken1) }

    assertFailsWith<IllegalStateException>(
      "Callback id is not registered to the Direct Store Muxer."
    ) { directStoreMuxer.getLocalData(MUX_ID_A, callbackToken2) }
  }

  @Test
  fun directStoreMuxer_withTtlCache_closesExpiredStores() = runBlockingTest {
    val fakeTime = FakeTime()
    val directStoreMuxer = createDirectStoreMuxer(this, time = fakeTime)
    val callbackToken1 = directStoreMuxer.on {}

    // Two stores are established outside the coroutine scope because a reference to them is needed
    // to confirm later that they have successfully closed.
    val storeA = directStoreMuxer.getStore(MUX_ID_A, callbackToken1).store
    val storeB = directStoreMuxer.getStore(MUX_ID_B, callbackToken1).store

    fakeTime.millis += 600 * 1000L // +10 minutes

    // Force a cache fetch.
    directStoreMuxer.getStore(MUX_ID_A, callbackToken1).store

    if (BuildFlags.DIRECT_STORE_MUXER_LRU_TTL) {
      // Check that the stores have successfully closed.
      assertThat(storeA.closed).isTrue()
      assertThat(storeB.closed).isTrue()
    } else {
      // Old behavior, will still be open.
      assertThat(storeA.closed).isFalse()
      assertThat(storeB.closed).isFalse()
    }
  }

  @Test
  fun propagateModelUpdates_fromProxyMuxer_toDrivers() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)

    val callbackToken = directStoreMuxer.on {}

    directStoreMuxer.onProxyMessage(
      MuxedProxyMessage(MUX_ID_A, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackToken))
    )

    val driverA = directStoreMuxer.getEntityDriver(MUX_ID_A)
    val capturedA = driverA.sentData.first()
    assertThat(capturedA.toRawEntity().singletons).containsExactly(
      "name", "bob".toReferencable(),
      "age", 42.toReferencable()
    )
    assertThat(directStoreMuxer.stores.size).isEqualTo(1)

    directStoreMuxer.onProxyMessage(
      MuxedProxyMessage(MUX_ID_B, ProxyMessage.ModelUpdate(entityCrdtB.data, callbackToken))
    )

    val driverB = directStoreMuxer.getEntityDriver(MUX_ID_B)
    val capturedB = driverB.sentData.first()
    assertThat(capturedB.toRawEntity().singletons).containsExactly(
      "name", "alice".toReferencable(),
      "age", 10.toReferencable()
    )
    assertThat(directStoreMuxer.stores.size).isEqualTo(2)
  }

  @Test
  fun propagatesModelUpdate_fromProxyMuxer_toOtherProxyMuxers() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)

    // Client that sends a model update to direct store muxer.
    var callback1Invoked = false
    val callbackToken1 = directStoreMuxer.on {
      callback1Invoked = true
    }

    val job = Job()
    // Client that receives a model update from direct store muxer.
    val callbackToken2 = directStoreMuxer.on { muxedMessage ->
      assertThat(muxedMessage.muxId).isEqualTo(MUX_ID_A)
      assertThat(muxedMessage.message is ProxyMessage.ModelUpdate).isTrue()
      val model = (muxedMessage.message as ProxyMessage.ModelUpdate).model
      assertThat(model).isEqualTo(entityCrdtA.data)
      job.complete()
    }

    // Set up store for muxIdA and register client.
    directStoreMuxer.getLocalData(MUX_ID_A, callbackToken2)

    directStoreMuxer.onProxyMessage(
      MuxedProxyMessage(MUX_ID_A, ProxyMessage.ModelUpdate(entityCrdtA.data, callbackToken1))
    )

    job.join()
    assertThat(callback1Invoked).isFalse()
  }

  @Test
  fun onlySendsModelResponse_toRequestingProxy() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)

    val job = Job()
    // Client that sends a sync request.
    val callbackToken1 = directStoreMuxer.on { muxedMessage ->
      assertThat(muxedMessage.message is ProxyMessage.ModelUpdate).isTrue()
      job.complete()
    }

    // Other client.
    var callback2Invoked = false
    directStoreMuxer.on {
      callback2Invoked = true
    }

    directStoreMuxer.onProxyMessage(
      MuxedProxyMessage(MUX_ID_A, ProxyMessage.SyncRequest(callbackToken1))
    )
    job.join()
    assertThat(callback2Invoked).isFalse()
  }

  @Test
  fun unregisterSuccessfully() = runBlockingTest {
    val directStoreMuxer = createDirectStoreMuxer(this)

    val callbackToken1 = directStoreMuxer.on {}

    val (idMapA, _) = directStoreMuxer.getStore(MUX_ID_A, callbackToken1)

    val (idMapB, _) = directStoreMuxer.getStore(MUX_ID_B, callbackToken1)

    assertThat(idMapA.size).isEqualTo(1)
    assertThat(idMapB.size).isEqualTo(1)

    directStoreMuxer.off(callbackToken1)

    assertThat(idMapA.size).isEqualTo(0)
    assertThat(idMapB.size).isEqualTo(0)

    assertFailsWith<IllegalStateException>(
      "Callback id is not registered to the Direct Store Muxer."
    ) { directStoreMuxer.getLocalData(MUX_ID_A, callbackToken1) }

    assertFailsWith<IllegalStateException>(
      "Callback id is not registered to the Direct Store Muxer."
    ) { directStoreMuxer.getLocalData(MUX_ID_B, callbackToken1) }
  }

  // region Helpers

  private fun createDirectStoreMuxer(
    scope: CoroutineScope,
    driverFactory: DriverFactory = FixedDriverFactory(MockDriverProvider()),
    time: Time = JvmTime,
    storageKey: StorageKey = STORAGE_KEY
  ): DirectStoreMuxerImpl<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity> {
    return DirectStoreMuxerImpl(
      storageKey,
      backingType = EntityType(SCHEMA),
      scope = scope,
      driverFactory = driverFactory,
      writeBackProvider = ::testWriteBackProvider,
      devTools = null,
      time = time
    )
  }

  private fun DirectStoreMuxer<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>.getEntityDriver(
    muxId: ReferenceId
  ): MockDriver<CrdtEntity.Data> =
    requireNotNull(stores[muxId]).store.driver as MockDriver<CrdtEntity.Data>

  private fun createPersonEntityCrdt(name: String, age: Int, version: Int = 1) = CrdtEntity(
    CrdtEntity.Data(
      versionMap = VersionMap("me" to version),
      singletons = mapOf(
        "name" to CrdtSingleton(
          initialVersion = VersionMap("me" to version),
          initialData = CrdtEntity.Reference.buildReference(name.toReferencable())
        ),
        "age" to CrdtSingleton(
          initialVersion = VersionMap("me" to version),
          initialData = CrdtEntity.Reference.buildReference(age.toReferencable())
        )
      )
    )
  )

  // endregion

  companion object {
    private val STORAGE_KEY = RamDiskStorageKey("test")
    private val SCHEMA = Schema(
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
    private const val MUX_ID_A = "a"
    private const val MUX_ID_B = "b"

    @get:JvmStatic
    @get:Parameterized.Parameters(name = "{0}")
    val PARAMETERS = ParameterizedBuildFlags.of(
      "DIRECT_STORE_MUXER_LRU_TTL"
    )
  }
}
