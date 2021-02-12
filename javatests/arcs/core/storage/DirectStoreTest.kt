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

import arcs.core.crdt.CrdtCount
import arcs.core.crdt.CrdtCount.Operation.Increment
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.VersionMap
import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.util.toReferencable
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.storage.testutil.FakeDriver
import arcs.core.storage.testutil.FakeDriverProvider
import arcs.core.storage.testutil.TestStoreWriteBack
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.TestCoroutineDispatcher
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [DirectStore]. */
@Suppress("UNCHECKED_CAST", "UNUSED_VARIABLE")
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class DirectStoreTest {
  val testKey: StorageKey = DummyStorageKey("key")
  lateinit var testScope: TestCoroutineScope
  lateinit var testStoreWriteBack: TestStoreWriteBack
  lateinit var testWriteBackProvider: WriteBackProvider

  @Before
  fun setup() {
    testScope = TestCoroutineScope(TestCoroutineDispatcher())
    testWriteBackProvider = object : WriteBackProvider {
      override fun invoke(protocol: Protocol): WriteBack {
        this@DirectStoreTest.testStoreWriteBack = TestStoreWriteBack(protocol, testScope)
        return this@DirectStoreTest.testStoreWriteBack
      }
    }
  }

  @Test(expected = CrdtException::class)
  fun throws_ifAppropriateDriverCantBeFound() = runBlockingTest {
    createStore()
  }

  @Test
  fun constructsDirectStores_whenRequired() = runBlockingTest {
    val (_, driverProvider) = setupFakes()

    val store = createStore(driverProvider)

    assertThat(store).isInstanceOf(DirectStore::class.java)
  }

  @Test
  fun propagatesModelUpdates_fromProxies_toDrivers() = runBlockingTest {
    val (driver, driverProvider) = setupFakes()

    val store = createStore(driverProvider) as DirectStore<CrdtData, CrdtOperation, Any?>

    val count = CrdtCount()
    count.applyOperation(Increment("me", VersionMap("me" to 1)))

    store.onProxyMessage(ProxyMessage.ModelUpdate(count.data, 1))

    assertThat(driver.lastData).isEqualTo(count.data)
  }

  @Test
  fun appliesAndPropagatesOperations_fromProxies_toDrivers() = runBlockingTest {
    val (driver, driverProvider) = setupFakes()

    val store = createStore(driverProvider) as DirectStore<CrdtData, CrdtOperation, Any?>

    val count = CrdtCount()
    val op = Increment("me", VersionMap("me" to 1))

    store.onProxyMessage(ProxyMessage.Operations(listOf(op), 1))

    count.applyOperation(op)

    assertThat(driver.lastData).isEqualTo(count.data)
  }

  @Test
  fun responds_toModelRequest_fromProxyWithModel() = runBlockingTest {
    val (_, driverProvider) = setupFakes()

    val store = createStore(driverProvider) as DirectStore<CrdtData, CrdtOperation, Any?>

    val count = CrdtCount()
    val op = Increment("me", VersionMap("me" to 1))
    count.applyOperation(op)

    val sentSyncRequest = atomic(false)
    val deferred = CompletableDeferred<Unit>(coroutineContext[Job.Key])
    var cbid = 0
    val callback: ProxyCallback<CrdtData, CrdtOperation, Any?> = { message ->
      when (message) {
        is ProxyMessage.Operations -> {
          assertThat(sentSyncRequest.getAndSet(true)).isFalse()
          // Make sure to request sync on this callback ID
          store.onProxyMessage(ProxyMessage.SyncRequest(cbid))
        }
        is ProxyMessage.ModelUpdate -> {
          assertThat(sentSyncRequest.value).isTrue()
          assertThat(message.model).isEqualTo(count.data)
          deferred.complete(Unit)
        }
        is ProxyMessage.SyncRequest -> {
          deferred.completeExceptionally(AssertionError("Shouldn't ever get here."))
        }
      }
    }

    // Set up the callback
    cbid = store.on(callback)
    // Send our op.
    store.onProxyMessage(ProxyMessage.Operations(listOf(op), 2))

    // Wait for our deferred to be completed.
    deferred.await()
    assertThat(sentSyncRequest.value).isTrue()
  }

  @Test
  fun sendSyncRequest_fromInvalidOperation() = runBlockingTest {
    val (_, driverProvider) = setupFakes()
    val store = createStore(driverProvider) as DirectStore<CrdtData, CrdtOperation, Any?>

    val deferred = CompletableDeferred<Unit>(coroutineContext[Job])
    val callback: ProxyCallback<CrdtData, CrdtOperation, Any?> = { message ->
      // Invalid ops will only cause a SyncRequest so any other message is considered unexpected.
      when (message) {
        is ProxyMessage.SyncRequest -> {
          deferred.complete(Unit)
        }
        else -> {
          deferred.completeExceptionally(AssertionError("Shouldn't ever get here."))
        }
      }
    }

    // Set up the callback
    val cbid = store.on(callback)

    // Send an invalid message with wrong VersionInfo, which should result in
    // a SyncRequest on the callback
    store.onProxyMessage(
      ProxyMessage.Operations(listOf(Increment("me", VersionMap("me" to 2))), cbid)
    )

    // Wait for our deferred to be completed.
    deferred.await()
  }

  @Test
  fun doesntSendResponse_to_offProxy() = runBlockingTest {
    val (_, driverProvider) = setupFakes()

    val store = createStore(driverProvider)

    val listener1Finished = CompletableDeferred<Unit>(coroutineContext[Job])
    val id1 = store.on { message ->
      assertThat(message).isInstanceOf(ProxyMessage.ModelUpdate::class.java)
      listener1Finished.complete(Unit)
    }
    val id2 = store.on {
      // id2 will be turned off so this callback shouldn't be ever called.
      fail("This callback should not be called.")
    }
    store.off(id2)

    store.onProxyMessage(ProxyMessage.SyncRequest(id2))
    store.onProxyMessage(ProxyMessage.SyncRequest(id1))

    listener1Finished.await()
  }

  @Test
  fun sendsAModelResponse_onlyTo_theRequestingProxy() = runBlockingTest {
    val (_, driverProvider) = setupFakes()

    val store = createStore(driverProvider)

    val listener1Finished = CompletableDeferred<Unit>(coroutineContext[Job.Key])
    val id1 = store.on { message ->
      assertThat(message).isInstanceOf(ProxyMessage.ModelUpdate::class.java)
      listener1Finished.complete(Unit)
    }
    val id2 = store.on {
      fail("This callback should not be called.")
    }

    store.onProxyMessage(ProxyMessage.SyncRequest(id1))

    listener1Finished.await()
  }

  @Test
  fun propagatesUpdates_fromDrivers_toProxies() = runBlockingTest {
    val (driver, driverProvider) = setupFakes()

    val store = createStore(driverProvider)

    val count = CrdtCount()
    count.applyOperation(Increment("me", VersionMap("me" to 1)))

    val listenerFinished = CompletableDeferred<Unit>(coroutineContext[Job.Key])

    store.on { message ->
      if (message is ProxyMessage.Operations) {
        assertThat(message.operations).containsExactly(
          CrdtCount.Operation.MultiIncrement("me", VersionMap("me" to 1), delta = 1)
        )
        listenerFinished.complete(Unit)
        return@on
      }
      listenerFinished.completeExceptionally(
        IllegalStateException("Should be an operations message.")
      )
    }

    driver.lastReceiver!!.invoke(count.data, 1)

    listenerFinished.await()
  }

  @Test
  fun doesntSendUpdateToDriver_afterDriverOriginatedMessages() = runBlockingTest {
    val (driver, driverProvider) = setupFakes()
    driver.throwOnSend = true

    val store = createStore(driverProvider)

    val remoteCount = CrdtCount()
    remoteCount.applyOperation(Increment("them", VersionMap("them" to 1)))

    // Note that this assumes no asynchrony inside Store.kt. This is guarded by the following
    // test, which will fail if driver.receiver() doesn't synchronously invoke driver.send().
    driver.lastReceiver!!.invoke(remoteCount.data, 1)
  }

  @Test
  fun doesntSendUpdateToDriver_afterDriverOriginatedMessages_CrdtSet() = runBlockingTest {
    val (driver, driverProvider) = setupSetFakes()
    driver.throwOnSend = true

    val schema = Schema(
      emptySet(),
      SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
      "abc"
    )
    val store: CollectionStore<RawEntity> = ActiveStore(
      StoreOptions(
        testKey,
        CollectionType(EntityType(schema))
      ),
      this,
      FixedDriverFactory(driverProvider),
      ::testWriteBackProvider,
      null,
      JvmTime
    )

    val remoteSet = CrdtSet<RawEntity>()
    val entity = RawEntity(
      id = "id",
      singletons = mapOf("name" to "a".toReferencable()),
      collections = emptyMap()
    )
    remoteSet.applyOperation(
      CrdtSet.Operation.Add(
        "bob",
        VersionMap("bob" to 1),
        entity
      )
    )

    // Note that this assumes no asynchrony inside Store.kt. This is guarded by the following
    // test, which will fail if driver.receiver() doesn't synchronously invoke driver.send().
    driver.lastReceiver!!.invoke(remoteSet.data, 1)
  }

  @Test
  fun resendsFailedDriverUpdates_afterMerging() = runBlockingTest {
    val (driver, driverProvider) = setupFakes()
    val firstCallComplete = CompletableDeferred<Unit>(coroutineContext[Job.Key])
    val secondCallComplete = CompletableDeferred<Unit>(coroutineContext[Job.Key])

    driver.doOnSend = { _, _ ->
      firstCallComplete.complete(Unit)
      false
    }

    val activeStore = createStore(driverProvider)

    // local count from proxy
    val count = CrdtCount()
    count.applyOperation(Increment("me", VersionMap("me" to 1)))

    // conflicting remote count from store
    val remoteCount = CrdtCount()
    remoteCount.applyOperation(Increment("them", VersionMap("them" to 1)))

    activeStore.onProxyMessage(ProxyMessage.ModelUpdate(count.data, 1))
    println("Received result.")

    firstCallComplete.await()

    println("Setting up for round two")
    // Reset, this time we'll capture the model it receives.
    driver.doOnSend = { _, _ ->
      secondCallComplete.complete(Unit)
      true
    }

    println("Calling receiver: ${driver.lastReceiver}")
    driver.lastReceiver!!.invoke(remoteCount.data, 1)
    println("Called captor")

    secondCallComplete.await()

    count.merge(remoteCount.data)
    assertThat(driver.lastData).isEqualTo(count.data)
  }

  @Test
  fun resolves_combinationOfMessages_fromProxyAndDriver() = runBlockingTest {
    val (driver, driverProvider) = setupFakes()

    val activeStore = createStore(driverProvider) as DirectStore<CrdtData, CrdtOperation, Any?>

    activeStore.onProxyMessage(
      ProxyMessage.Operations(listOf(Increment("me", VersionMap("me" to 1))), id = 1)
    )
    activeStore.onProxyMessage(
      ProxyMessage.Operations(listOf(Increment("me", VersionMap("me" to 2))), id = 1)
    )
    activeStore.onProxyMessage(
      ProxyMessage.Operations(listOf(Increment("me", VersionMap("me" to 3))), id = 1)
    )

    CrdtCount.Data()
    driver.lastReceiver!!.invoke(
      CrdtCount.Data(
        mutableMapOf("me" to 1, "them" to 1),
        VersionMap("me" to 1, "them" to 1)
      ),
      1
    )
    driver.lastReceiver!!.invoke(
      CrdtCount.Data(
        mutableMapOf("me" to 1, "them" to 2),
        VersionMap("me" to 1, "them" to 2)
      ),
      2
    )

    activeStore.idle()

    assertThat(activeStore.getLocalData()).isEqualTo(driver.lastData)
  }

  @Test
  fun close_setClosed_andCloseDriver() = runBlockingTest {
    val (driver, driverProvider) = setupFakes()

    val activeStore = createStore(driverProvider) as DirectStore<CrdtData, CrdtOperation, Any?>
    assertThat(activeStore.closed).isFalse()
    assertThat(driver.closed).isFalse()
    assertThat(testStoreWriteBack.closed).isFalse()

    activeStore.close()
    assertThat(activeStore.closed).isTrue()
    assertThat(driver.closed).isTrue()
    assertThat(testStoreWriteBack.closed).isTrue()
  }

  private fun setupFakes(): Pair<FakeDriver<CrdtCount.Data>, FakeDriverProvider> {
    val fakeDriver = FakeDriver<CrdtCount.Data>(testKey)
    val fakeProvider = FakeDriverProvider(testKey to fakeDriver)
    return fakeDriver to fakeProvider
  }

  private fun setupSetFakes(): Pair<FakeDriver<CrdtSet.Data<*>>, FakeDriverProvider> {
    val fakeDriver = FakeDriver<CrdtSet.Data<*>>(testKey)
    val fakeProvider = FakeDriverProvider(testKey to fakeDriver)
    return fakeDriver to fakeProvider
  }

  private suspend fun CoroutineScope.createStore(vararg providers: DriverProvider) =
    ActiveStore<CrdtData, CrdtOperation, Any?>(
      StoreOptions(testKey, CountType()),
      this,
      FixedDriverFactory(*providers),
      this@DirectStoreTest.testWriteBackProvider,
      null,
      JvmTime
    )
}
