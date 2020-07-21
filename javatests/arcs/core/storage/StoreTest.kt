/*
 * Copyright 2019 Google LLC.
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
import arcs.core.type.Type
import com.google.common.truth.Truth.assertThat
import kotlin.reflect.KClass
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Store]. */
@Suppress("UNCHECKED_CAST", "UNUSED_VARIABLE")
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class StoreTest {
    val testKey: StorageKey = DummyStorageKey("key")

    @Before
    fun setup() {
        DriverFactory.clearRegistrations()
    }

    @After
    fun teardown() {
        DriverFactory.clearRegistrations()
    }

    @Test(expected = CrdtException::class)
    fun throws_ifAppropriateDriverCantBeFound() = runBlockingTest {
        createStore()
    }

    @Test
    fun constructsDirectStores_whenRequired() = runBlockingTest {
        setupFakes()

        val store = createStore()

        assertThat(store).isInstanceOf(DirectStore::class.java)
    }

    @Test
    fun propagatesModelUpdates_fromProxies_toDrivers() = runBlockingTest {
        val (driver, _) = setupFakes()

        val store = createStore() as DirectStore<CrdtData, CrdtOperation, Any?>

        val count = CrdtCount()
        count.applyOperation(Increment("me", 0 to 1))

        assertThat(store.onProxyMessage(ProxyMessage.ModelUpdate(count.data, 1)))
            .isTrue()

        assertThat(driver.lastData).isEqualTo(count.data)
    }

    @Test
    fun appliesAndPropagatesOperations_fromProxies_toDrivers() = runBlockingTest {
        val (driver, _) = setupFakes()

        val store = createStore() as DirectStore<CrdtData, CrdtOperation, Any?>

        val count = CrdtCount()
        val op = Increment("me", 0 to 1)

        assertThat(store.onProxyMessage(ProxyMessage.Operations(listOf(op), 1))).isTrue()

        count.applyOperation(op)

        assertThat(driver.lastData).isEqualTo(count.data)
    }

    @Test
    fun responds_toModelRequest_fromProxyWithModel() = runBlockingTest {
        val (driver, _) = setupFakes()

        val store = createStore() as DirectStore<CrdtData, CrdtOperation, Any?>

        val count = CrdtCount()
        val op = Increment("me", 0 to 1)
        count.applyOperation(op)

        val sentSyncRequest = atomic(false)
        val deferred = CompletableDeferred<Unit>(coroutineContext[Job.Key])
        var cbid = 0
        val callback = ProxyCallback<CrdtData, CrdtOperation, Any?> { message ->
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
    fun sendsAModelResponse_onlyTo_theRequestingProxy() = runBlockingTest {
        setupFakes()

        val store = createStore()

        val listener1Finished = CompletableDeferred<Unit>(coroutineContext[Job.Key])
        val id1 = store.on(ProxyCallback { message ->
            assertThat(message).isInstanceOf(ProxyMessage.ModelUpdate::class.java)
            listener1Finished.complete(Unit)
        })
        val id2 = store.on(ProxyCallback {
            fail("This callback should not be called.")
        })

        store.onProxyMessage(ProxyMessage.SyncRequest(id1))

        listener1Finished.await()
    }

    @Test
    fun propagatesUpdates_fromDrivers_toProxies() = runBlockingTest {
        val (driver, _) = setupFakes()

        val store = createStore()

        val count = CrdtCount()
        count.applyOperation(Increment("me", 0 to 1))

        val listenerFinished = CompletableDeferred<Unit>(coroutineContext[Job.Key])

        store.on(ProxyCallback { message ->
            if (message is ProxyMessage.Operations) {
                assertThat(message.operations.size).isEqualTo(1)
                assertThat(message.operations[0])
                    .isEqualTo(CrdtCount.Operation.MultiIncrement("me", 0 to 1, delta = 1))
                listenerFinished.complete(Unit)
                return@ProxyCallback
            }
            listenerFinished.completeExceptionally(
                IllegalStateException("Should be an operations message.")
            )
        })

        driver.lastReceiver!!.invoke(count.data, 1)

        listenerFinished.await()
    }

    @Test
    fun doesntSendUpdateToDriver_afterDriverOriginatedMessages() = runBlockingTest {
        val (driver, _) = setupFakes()
        driver.throwOnSend = true

        val store = createStore()

        val remoteCount = CrdtCount()
        remoteCount.applyOperation(Increment("them", 0 to 1))

        // Note that this assumes no asynchrony inside Store.kt. This is guarded by the following
        // test, which will fail if driver.receiver() doesn't synchronously invoke driver.send().
        driver.lastReceiver!!.invoke(remoteCount.data, 1)
    }

    @Test
    fun doesntSendUpdateToDriver_afterDriverOriginatedMessages_CrdtSet() = runBlockingTest {
        val (driver, _) = setupSetFakes()
        driver.throwOnSend = true

        val schema = Schema(
            emptySet(),
            SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
            "abc"
        )
        val store: CollectionStore<RawEntity> = DefaultActivationFactory(
            StoreOptions(
                testKey,
                CollectionType(EntityType(schema))
            )
        )

        val remoteSet = CrdtSet<RawEntity>()
        val entity = RawEntity(
            id = "id",
            singletons = mapOf("name" to "a".toReferencable()),
            collections = emptyMap()
        )
        remoteSet.applyOperation(CrdtSet.Operation.Add(
            "bob",
            VersionMap("bob" to 1),
            entity
        ))

        // Note that this assumes no asynchrony inside Store.kt. This is guarded by the following
        // test, which will fail if driver.receiver() doesn't synchronously invoke driver.send().
        driver.lastReceiver!!.invoke(remoteSet.data, 1)
    }

    @Test
    fun resendsFailedDriverUpdates_afterMerging() = runBlockingTest {
        val (driver, _) = setupFakes()
        val firstCallComplete = CompletableDeferred<Unit>(coroutineContext[Job.Key])
        val secondCallComplete = CompletableDeferred<Unit>(coroutineContext[Job.Key])

        driver.doOnSend = { _, _ ->
            firstCallComplete.complete(Unit)
            false
        }

        val activeStore = createStore()

        // local count from proxy
        val count = CrdtCount()
        count.applyOperation(Increment("me", 0 to 1))

        // conflicting remote count from store
        val remoteCount = CrdtCount()
        remoteCount.applyOperation(Increment("them", 0 to 1))

        val result = activeStore.onProxyMessage(ProxyMessage.ModelUpdate(count.data, 1))
        println("Received result.")

        firstCallComplete.await()
        assertThat(result).isTrue()

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
        val (driver, _) = setupFakes()

        val activeStore = createStore() as DirectStore<CrdtData, CrdtOperation, Any?>

        activeStore.onProxyMessage(ProxyMessage.Operations(listOf(Increment("me", 0 to 1)), id = 1))
        activeStore.onProxyMessage(ProxyMessage.Operations(listOf(Increment("me", 1 to 2)), id = 1))
        activeStore.onProxyMessage(ProxyMessage.Operations(listOf(Increment("me", 2 to 3)), id = 1))

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

    private fun setupFakes(): Pair<FakeDriver<CrdtCount.Data>, FakeProvider> {
        val fakeDriver = FakeDriver<CrdtCount.Data>()
        val fakeProvider = FakeProvider(fakeDriver)
        DriverFactory.register(fakeProvider)
        return fakeDriver to fakeProvider
    }

    private fun setupSetFakes(): Pair<FakeDriver<CrdtSet.Data<*>>, FakeProvider> {
        val fakeDriver = FakeDriver<CrdtSet.Data<*>>()
        val fakeProvider = FakeProvider(fakeDriver)
        DriverFactory.register(fakeProvider)
        return fakeDriver to fakeProvider
    }

    private suspend fun createStore() =
        DefaultActivationFactory<CrdtData, CrdtOperation, Any?>(StoreOptions(testKey, CountType()))

    private inner class FakeDriver<T : CrdtData> : Driver<T> {
        override val storageKey: StorageKey = testKey
        override var token: String? = null

        var throwOnSend: Boolean = false
        var doOnSend: ((data: T, version: Int) -> Boolean)? = null
        var sendReturnValue: Boolean = true
        var lastReceiver: (suspend (data: T, version: Int) -> Unit)? = null
        var lastData: T? = null
        var lastVersion: Int? = null

        override suspend fun registerReceiver(
            token: String?,
            receiver: suspend (data: T, version: Int) -> Unit
        ) {
            lastReceiver = receiver
        }

        override suspend fun send(data: T, version: Int): Boolean {
            if (throwOnSend) throw UnsupportedOperationException("Not supposed to be called")
            lastData = data
            lastVersion = version
            return doOnSend?.invoke(data, version) ?: sendReturnValue
        }
    }

    private inner class FakeProvider(val fakeDriver: FakeDriver<*>) : DriverProvider {
        override fun willSupport(storageKey: StorageKey): Boolean {
            return storageKey == testKey
        }

        override suspend fun <Data : Any> getDriver(
            storageKey: StorageKey,
            dataClass: KClass<Data>,
            type: Type
        ): Driver<Data> = fakeDriver as Driver<Data>
    }
}
