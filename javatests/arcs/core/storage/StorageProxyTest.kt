package arcs.core.storage

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.VersionMap
import arcs.core.data.Ttl
import arcs.jvm.util.testutil.TimeImpl
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
import org.mockito.Mockito.any
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
        val readHandle = newHandle("testReader", storageProxy, true)
        val readCallback = mock<(String)->Unit>().also { readHandle.addOnUpdate(it) }
        mockCrdtModel.appliesOpAs(mockCrdtOperation, true)

        storageProxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))

        verify(readCallback).invoke(mockCrdtModel.consumerView)
    }

    @Test
    fun propagatesStorageFullModelToReaders() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val readHandle = newHandle("testReader", storageProxy, true)
        val syncCallback = mock<()->Unit>().also { readHandle.addOnSync(it) }
        mockCrdtModel.appliesOpAs(mockCrdtOperation, true)

        storageProxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))

        verify(syncCallback).invoke()
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
    fun failedApplyOpTriggersSync() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val readHandle = newHandle("testReader", storageProxy, true)
        // TODO - test that local application but store failure results in sync
    }

    @Test
    fun getParticleViewReturnsSyncedState() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        whenever(mockCrdtModel.consumerView).thenReturn("someData")
        val readHandle = newHandle("testReader", storageProxy, true)
        mockCrdtModel.appliesOpAs(mockCrdtOperation, true)

        assertThat(storageProxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null)))
            .isTrue()
        val view = storageProxy.getParticleView()

        assertThat(view).isEqualTo("someData")
    }

    @Test
    fun getParticleViewWhenUnsyncedQueues() = runBlockingTest {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        whenever(mockCrdtModel.consumerView).thenReturn("someData")
        val readHandle = newHandle("testReader", storageProxy, true)
        mockCrdtModel.appliesOpAs(mockCrdtOperation, true)

        // get view when not synced
        val future = storageProxy.getParticleViewAsync()
        assertThat(future.isCompleted).isFalse()

        // cleanly apply model from Store so we are now synced
        assertThat(storageProxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtModel.data, null)))
            .isTrue()

        assertThat(future.isCompleted).isTrue()
        val view = future.await()

        assertThat(view).isEqualTo("someData")
    }

    @Test
    @Ignore("We've detected flakes with this approach, reworking in follow up PR")
    fun deadlockDetectionTest() = runBlocking {
        val storageProxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        whenever(mockCrdtModel.consumerView).thenReturn("someData")

        val ops = listOf(
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

    private fun newHandle(
        name: String,
        storageProxy: StorageProxy<CrdtData, CrdtOperationAtTime, String>,
        reader: Boolean
    ) = Handle(name, storageProxy, Ttl.Infinite, TimeImpl(), reader, true)

    fun CrdtModel<CrdtData, CrdtOperationAtTime, String>.appliesOpAs(op: CrdtOperationAtTime, result: Boolean) {
        whenever(this.applyOperation(op)).thenReturn(result)
    }
}
