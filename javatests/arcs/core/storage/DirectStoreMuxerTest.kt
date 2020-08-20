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
import arcs.core.type.Type
import com.google.common.truth.Truth.assertThat
import kotlin.reflect.KClass
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.lang.IllegalStateException
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
@ExperimentalCoroutinesApi
class DirectStoreMuxerTest {

    private val storageKey: RamDiskStorageKey = RamDiskStorageKey("test")
    private val schema = Schema(
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

    @After
    fun teardown() {
        DriverFactory.clearRegistrations()
    }

    @Test
    fun directStoreMuxerNoRace() = runBlocking<Unit>(Dispatchers.IO) {
        DriverAndKeyConfigurator.configure(null)

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
        val callback = ProxyCallback<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity> {
            callbacks++
        }

        val directStoreMuxer = DirectStoreMuxer<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
            storageKey = storageKey,
            backingType = EntityType(schema)
        )
        val callbackId = directStoreMuxer.on(callback)

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
            launch {
                directStoreMuxer.getLocalData("a", callbackId)
            }
            launch {
                directStoreMuxer.onProxyMessage(
                    ProxyMessage.ModelUpdate(data, id = callbackId, muxId = "a")
                )
            }
            launch {
                directStoreMuxer.getLocalData("a", callbackId)
            }
            launch {
                directStoreMuxer.onProxyMessage(
                    ProxyMessage.ModelUpdate(data, id = callbackId, muxId = "a")
                )
            }
            launch {
                directStoreMuxer.getLocalData("a", callbackId)
            }
            launch {
                directStoreMuxer.onProxyMessage(
                    ProxyMessage.ModelUpdate(data, id = callbackId, muxId = "a")
                )
            }
        }

        val otherStore = DirectStore.create<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
            StoreOptions(
                storageKey = storageKey.childKeyWithComponent("a"),
                type = EntityType(schema)
            )
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
    fun directStoreMuxer_maintains_consistent_state() = runBlocking<Unit>(Dispatchers.IO) {
        val driverProvider = MockDriverProvider()
        DriverFactory.register(driverProvider)


        val directStoreMuxer = createDirectStoreMuxer()

        val entityCrdtA = createPersonEntityCrdt("bob", 42)
        val entityCrdtB = createPersonEntityCrdt("alice", 10)

        val callbackId1 = directStoreMuxer.on(ProxyCallback {})
        val callbackId2 = directStoreMuxer.on(ProxyCallback {})
        val storeA = directStoreMuxer.getStore("a").store
        val storeB = directStoreMuxer.getStore("b").store

        coroutineScope {
            launch {
                directStoreMuxer.getLocalData("a", callbackId1)
                directStoreMuxer.off(callbackId1)
            }
            launch {
                directStoreMuxer.getLocalData("a", callbackId2)
                directStoreMuxer.onProxyMessage(
                    ProxyMessage.ModelUpdate(entityCrdtA.data, id = callbackId2, muxId = "a")
                )
                directStoreMuxer.off(callbackId2)
            }
            launch {
                val callbackId3 = directStoreMuxer.on(ProxyCallback {})
                directStoreMuxer.getLocalData("a", callbackId3)
                directStoreMuxer.onProxyMessage(ProxyMessage.SyncRequest(id = callbackId3, muxId = "a"))
                directStoreMuxer.onProxyMessage(ProxyMessage.SyncRequest(id = callbackId3, muxId = "b"))
                directStoreMuxer.onProxyMessage(ProxyMessage.SyncRequest(id = callbackId3, muxId = "a"))
            }
            launch {
                val callbackId4 = directStoreMuxer.on(ProxyCallback {})
                directStoreMuxer.getLocalData("b", callbackId4)
                directStoreMuxer.onProxyMessage(ProxyMessage.SyncRequest(id = callbackId4, muxId = "a"))
                directStoreMuxer.onProxyMessage(
                    ProxyMessage.ModelUpdate(entityCrdtB.data, id = callbackId4, muxId = "b")
                )
                directStoreMuxer.onProxyMessage(ProxyMessage.SyncRequest(id = callbackId4, muxId = "b"))
            }
            launch {
                val callbackId5 = directStoreMuxer.on(ProxyCallback {})
                directStoreMuxer.getLocalData("a", callbackId5)
                directStoreMuxer.getLocalData("b", callbackId5)
                directStoreMuxer.onProxyMessage(ProxyMessage.SyncRequest(id = callbackId5, muxId = "b"))
                directStoreMuxer.onProxyMessage(
                    ProxyMessage.ModelUpdate(entityCrdtB.data, id = callbackId5, muxId = "a")
                )
                directStoreMuxer.onProxyMessage(
                    ProxyMessage.ModelUpdate(entityCrdtA.data, id = callbackId5, muxId = "b")
                )
            }
            launch {
                val callbackId6 = directStoreMuxer.on(ProxyCallback {})
                directStoreMuxer.onProxyMessage(
                    ProxyMessage.ModelUpdate(entityCrdtA.data, id = callbackId6, muxId = "a")
                )
                directStoreMuxer.clearStoresCache()
            }
        }

        assertThat(storeA.closed).isTrue()
        assertThat(storeB.closed).isTrue()

        assertThat(directStoreMuxer.consistentState()).isTrue()

        // check that deregistered callbacks are no longer registered with DSM
        assertFailsWith<IllegalStateException>("Callback token is not registered to the Direct Store Muxer.", { directStoreMuxer.getLocalData("a", callbackId1) })
        assertFailsWith<IllegalStateException>("Callback token is not registered to the Direct Store Muxer.", { directStoreMuxer.getLocalData("a", callbackId2) })
    }

    @Test
    fun propagatesModelUpdates_fromProxyMuxer_toDrivers() = runBlockingTest {
        val driverProvider = MockDriverProvider()
        DriverFactory.register(driverProvider)

        val directStoreMuxer = createDirectStoreMuxer()

        val callbackId = directStoreMuxer.on(ProxyCallback {})

        val entityCrdtA = createPersonEntityCrdt("bob", 42)

        assertThat(
            directStoreMuxer.onProxyMessage(
                ProxyMessage.ModelUpdate(entityCrdtA.data, id = callbackId, muxId = "a")
            )
        ).isTrue()

        val driverA = directStoreMuxer.getEntityDriver("a")
        val capturedA = driverA.sentData.first()
        assertThat(capturedA.toRawEntity().singletons)
            .containsExactly(
                "name", "bob".toReferencable(),
                "age", 42.toReferencable()
            )
        assertThat(directStoreMuxer.stores.size).isEqualTo(1)

        val entityCrdtB = createPersonEntityCrdt("alice", 10)

        assertThat(
            directStoreMuxer.onProxyMessage(
                ProxyMessage.ModelUpdate(entityCrdtB.data, id = callbackId, muxId = "b")
            )
        ).isTrue()

        val driverB = directStoreMuxer.getEntityDriver("b")
        val capturedB = driverB.sentData.first()
        assertThat(capturedB.toRawEntity().singletons)
            .containsExactly(
                "name", "alice".toReferencable(),
                "age", 10.toReferencable()
            )
        assertThat(directStoreMuxer.stores.size).isEqualTo(2)
    }

    @Test
    fun propagatesModelUpdate_fromProxyMuxer_toDriver_toOtherProxyMuxers() = runBlockingTest {
        val driverProvider = MockDriverProvider()
        DriverFactory.register(driverProvider)

        val directStoreMuxer = createDirectStoreMuxer()

        val job = Job(coroutineContext[Job])

        // Client that sends a model update to direct store muxer.
        var callbackInvoked = false
        val callbackId1 = directStoreMuxer.on(ProxyCallback {
            callbackInvoked = true
        })

        // Client that receives a model update from direct store muxer.
        val callbackId2 = directStoreMuxer.on(ProxyCallback {
            assertThat(it is ProxyMessage.ModelUpdate).isTrue()
            job.complete()
        })

        // Set up store for muxId "a" and register for each client.
        val muxIdA = "a"
        directStoreMuxer.getLocalData(muxIdA, callbackId1)
        directStoreMuxer.getLocalData(muxIdA, callbackId2)

        val entityCrdtA = createPersonEntityCrdt("bob", 42)

        assertThat(
            directStoreMuxer.onProxyMessage(
                ProxyMessage.ModelUpdate(entityCrdtA.data, id = callbackId1, muxId = muxIdA)
            )
        ).isTrue()

        val driverA = directStoreMuxer.getEntityDriver(muxIdA)
        val capturedA = driverA.sentData.first()
        assertThat(capturedA.toRawEntity().singletons)
            .containsExactly(
                "name", "bob".toReferencable(),
                "age", 42.toReferencable()
            )
        job.join()
        assertThat(callbackInvoked).isFalse()
    }

    @Test
    fun onlySendsModelResponse_toRequestingProxy() = runBlockingTest {
        val driverProvider = MockDriverProvider()
        DriverFactory.register(driverProvider)

        val directStoreMuxer = createDirectStoreMuxer()

        val job = Job(coroutineContext[Job.Key])

        // Client that sends a sync request.
        val callbackId1 = directStoreMuxer.on(ProxyCallback {
            assertThat(it is ProxyMessage.ModelUpdate).isTrue()
            job.complete()
        })

        // Other client.
        var callback2Invoked = false
        val callbackId2 = directStoreMuxer.on(ProxyCallback {
            callback2Invoked = true
        })

        // Set up store for muxId "a" and register for each client.
        val muxIdA = "a"
        directStoreMuxer.getLocalData(muxIdA, callbackId1)
        directStoreMuxer.getLocalData(muxIdA, callbackId2)

        directStoreMuxer.onProxyMessage(ProxyMessage.SyncRequest(id = callbackId1, muxId = muxIdA))
        job.join()
        assertThat(callback2Invoked).isFalse()
    }

    @Test
    fun unregisterSuccessfully() = runBlockingTest {
        val driverProvider = MockDriverProvider()
        DriverFactory.register(driverProvider)

        val directStoreMuxer = createDirectStoreMuxer()

        val callbackId1 = directStoreMuxer.on(ProxyCallback {})

        val muxIdA = "a"
        val (idSetA, _) = directStoreMuxer.getStore(muxIdA)
        directStoreMuxer.getLocalData(muxIdA, callbackId1)

        val muxIdB = "b"
        val (idSetB, _) = directStoreMuxer.getStore(muxIdB)
        directStoreMuxer.getLocalData(muxIdB, callbackId1)

        assertThat(idSetA.size).isEqualTo(1)
        assertThat(idSetB.size).isEqualTo(1)

        directStoreMuxer.off(callbackId1)

        assertThat(idSetA).isEmpty()
        assertThat(idSetB).isEmpty()
    }

    // region Helpers
    private fun createDirectStoreMuxer():
        DirectStoreMuxer<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity> {
        return DirectStoreMuxer<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
            storageKey,
            backingType = EntityType(schema)
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

    // region Mocks
    // TODO: Refactor Mocks into it's own file (as they are reused in ReferenceModeStoreTest).
    private class MockDriverProvider : DriverProvider {
        override fun willSupport(storageKey: StorageKey): Boolean = true

        override suspend fun <Data : Any> getDriver(
            storageKey: StorageKey,
            dataClass: KClass<Data>,
            type: Type
        ): Driver<Data> = DirectStoreMuxerTest.MockDriver(storageKey)
    }

    private class MockDriver<T : Any>(
        override val storageKey: StorageKey
    ) : Driver<T> {
        override var token: String? = null
        var receiver: (suspend (data: T, version: Int) -> Unit)? = null
        var sentData = mutableListOf<T>()
        var fail = false

        override suspend fun registerReceiver(
            token: String?,
            receiver: suspend (data: T, version: Int) -> Unit
        ) {
            this.token = token
            this.receiver = receiver
        }

        override suspend fun send(data: T, version: Int): Boolean {
            sentData.add(data)
            return !fail
        }
    }

    // endregion
}
