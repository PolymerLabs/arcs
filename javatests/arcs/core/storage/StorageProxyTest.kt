package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.VersionMap
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import com.nhaarman.mockitokotlin2.whenever
import java.util.concurrent.Executors
import kotlin.random.Random
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import kotlinx.coroutines.withTimeout
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.MockitoAnnotations

@Suppress("UNCHECKED_CAST", "UNUSED_VARIABLE")
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class StorageProxyTest {
    private lateinit var fakeStoreEndpoint: StoreEndpointFake<CrdtData, CrdtOperationAtTime, String>

    @Mock private lateinit var mockStorageEndpointProvider:
        StorageCommunicationEndpointProvider<CrdtData, CrdtOperationAtTime, String>
    @Mock private lateinit var mockCrdtOperation: CrdtOperationAtTime
    @Mock private lateinit var mockCrdtModel: CrdtModel<CrdtData, CrdtOperationAtTime, String>
    @Mock private lateinit var mockCrdtData: CrdtData

    @Before
    fun setup() {
        MockitoAnnotations.initMocks(this)
        fakeStoreEndpoint = StoreEndpointFake()
        whenever(mockStorageEndpointProvider.getStorageEndpoint()).thenReturn(fakeStoreEndpoint)
        whenever(mockCrdtModel.data).thenReturn(mockCrdtData)
        whenever(mockCrdtModel.versionMap).thenReturn(VersionMap())
        whenever(mockCrdtOperation.clock).thenReturn(VersionMap())
    }

    @Test
    fun propagatesStorageOpToReaders() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (readHandle, readCallback) = newHandle("testReader", storageProxy, true)
        mockCrdtModel.appliesOpAs(mockCrdtOperation, true)

        storageProxy.registerHandle(readHandle)
        storageProxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))

        verify(readCallback).onUpdate(readHandle, mockCrdtOperation)
    }

    @Test
    fun propagatesStorageFullModelToReaders() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (readHandle, readCallback) = newHandle("testReader", storageProxy, true)
        mockCrdtModel.appliesOpAs(mockCrdtOperation, true)

        storageProxy.registerHandle(readHandle)
        storageProxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))

        verify(readCallback).onSync(readHandle)
    }

    @Test
    fun propagatesStorageSyncReqToStorage() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        mockCrdtModel.appliesOpAs(mockCrdtOperation, true)

        storageProxy.onMessage(ProxyMessage.SyncRequest(null))

        val modelUpdate = ProxyMessage.ModelUpdate<CrdtData, CrdtOperation, String>(mockCrdtData, null)
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(modelUpdate)
    }

    @Test
    fun propagatesUpdatesToReadersAndNotToWriters() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (readHandle, readCallback) = newHandle("testReader", storageProxy, true)
        val (writeHandle ,writeCallback) = newHandle("testWriter", storageProxy, false)
        mockCrdtModel.appliesOpAs(mockCrdtOperation, true)

        storageProxy.registerHandle(readHandle)
        storageProxy.registerHandle(writeHandle)
        assertThat(storageProxy.applyOp(mockCrdtOperation)).isTrue()

        verify(readCallback).onUpdate(readHandle, mockCrdtOperation)
        verifyNoMoreInteractions(writeCallback)
    }

    @Test
    fun failedApplyOpTriggersSync() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (readHandle, _) = newHandle("testReader", storageProxy, true)
        mockCrdtModel.appliesOpAs(mockCrdtOperation, false)

        storageProxy.registerHandle(readHandle)
        assertThat(storageProxy.applyOp(mockCrdtOperation)).isFalse()

        val syncReq = ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(syncReq)
    }

    @Test
    fun getParticleViewReturnsSyncedState() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        whenever(mockCrdtModel.consumerView).thenReturn("someData")
        val (readHandle, _) = newHandle("testReader", storageProxy, true)
        mockCrdtModel.appliesOpAs(mockCrdtOperation, true)

        storageProxy.registerHandle(readHandle)
        assertThat(storageProxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null)))
            .isTrue()
        val view = storageProxy.getParticleView()

        assertThat(view.value).isEqualTo("someData")
        assertThat(view.versionMap).isEqualTo(VersionMap())
    }

    @Test
    fun getParticleViewWhenUnsyncedQueues() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        whenever(mockCrdtModel.consumerView).thenReturn("someData")
        val (readHandle, _) = newHandle("testReader", storageProxy, true)
        mockCrdtModel.appliesOpAs(mockCrdtOperation, true)
        storageProxy.registerHandle(readHandle)

        // get view when not synced
        val future = storageProxy.getParticleViewAsync()
        assertThat(future.isCompleted).isFalse()

        // cleanly apply model from Store so we are now synced
        assertThat(storageProxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtModel.data, null)))
            .isTrue()

        assertThat(future.isCompleted).isTrue()
        val view = future.await()

        assertThat(view.value).isEqualTo("someData")
        assertThat(view.versionMap).isEqualTo(VersionMap())
    }

    @Test
    @Ignore("We've detected flakes with this approach, reworking in follow up PR")
    fun deadlockDetectionTest() = runBlocking {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        whenever(mockCrdtModel.consumerView).thenReturn("someData")

        val ops = listOf(
            suspend {
                // registerHandle
                val (handle, _) = newHandle("testReader", storageProxy, true)
                storageProxy.registerHandle(handle)
            },
            suspend {
                // deregisterHandle
                val (handle, _) = newHandle("testReader-${Random.nextInt()}", storageProxy, true)
                storageProxy.registerHandle(handle)
                storageProxy.deregisterHandle(handle)
            },
            suspend {
                // store sends sync req
                val syncReq = ProxyMessage.SyncRequest<CrdtData, CrdtOperationAtTime, String>(null)
                storageProxy.onMessage(syncReq)
            },
            suspend {
                // store sends op
                val op = mock(CrdtOperationAtTime::class.java)
                storageProxy.onMessage(ProxyMessage.Operations(listOf(op), null))
            },
            suspend {
                // handle sends op
                val op = mock(CrdtOperationAtTime::class.java)
                mockCrdtModel.appliesOpAs(op, Random.nextBoolean())
                storageProxy.applyOp(op)
            },
            suspend {
                // handle reads data
                storageProxy.getParticleView()
                // make sure we follow up by ensuring view is synced so the particle view doesn't
                // stay blocked
                launch {
                    delay(10)
                    val op = mock(CrdtOperationAtTime::class.java)
                    mockCrdtModel.appliesOpAs(op, true)
                    storageProxy.onMessage(ProxyMessage.Operations(listOf(op), null))
                }
            }
        )

        val workers = 20
        val jobs = 10
        Executors.newFixedThreadPool(workers).asCoroutineDispatcher().use {inPool ->
            repeat(10) {
                runBlocking {
                    withTimeout(5000) {
                        repeat(workers) {
                            launch(inPool) {
                                repeat(jobs) {
                                    val randomOp = ops[Random.nextInt(0, ops.size - 1)]
                                    randomOp()
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private data class HandleWithCallback<Data : CrdtData, Op : CrdtOperationAtTime, T>(
        val handle: Handle<Data, Op, T>,
        val callback: Callbacks<Data, Op, T>
    )

    private fun newHandle(
        name: String,
        storageProxy: StorageProxy<CrdtData, CrdtOperationAtTime, String>,
        reader: Boolean
    ) = mock<Callbacks<CrdtData, CrdtOperationAtTime, String>>().let {
        HandleWithCallback(Handle(name, storageProxy, it, reader, true), it)
    }

    fun CrdtModel<CrdtData, CrdtOperationAtTime, String>.appliesOpAs(op: CrdtOperationAtTime, result: Boolean) {
        whenever(this.applyOperation(op)).thenReturn(result)
    }
}
