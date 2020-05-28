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

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.crdt.VersionMap
import arcs.core.storage.StorageProxy.ProxyState
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import com.nhaarman.mockitokotlin2.whenever
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.MockitoAnnotations

@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class StorageProxyTest {
    @get:Rule
    val log = LogRule()

    private lateinit var fakeStoreEndpoint: StoreEndpointFake<CrdtData, CrdtOperationAtTime, String>

    @Mock private lateinit var mockStorageEndpointProvider:
        StorageCommunicationEndpointProvider<CrdtData, CrdtOperationAtTime, String>
    @Mock private lateinit var mockCrdtOperation: CrdtOperationAtTime
    @Mock private lateinit var mockCrdtModel: CrdtModel<CrdtData, CrdtOperationAtTime, String>
    @Mock private lateinit var mockCrdtData: CrdtData

    private val scheduler = Scheduler(EmptyCoroutineContext)
    private val callbackId = StorageProxy.CallbackIdentifier("test")

    @Before
    fun setup() {
        MockitoAnnotations.initMocks(this)
        fakeStoreEndpoint = StoreEndpointFake()
        whenever(mockStorageEndpointProvider.getStorageEndpoint(any()))
            .thenReturn(fakeStoreEndpoint)
        whenever(mockCrdtModel.data).thenReturn(mockCrdtData)
        whenever(mockCrdtModel.versionMap).thenReturn(VersionMap())
        whenever(mockCrdtModel.consumerView).thenReturn("data")
        whenever(mockCrdtOperation.clock).thenReturn(VersionMap())
    }

    @Test
    fun initiatingSyncWhenPreparedSendsSyncRequest() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)

        // Readable handles are observing this proxy.
        proxy.prepareForSync()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
        proxy.prepareForSync()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
        scheduler.waitForIdle()
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()

        // Sync request should be sent.
        proxy.maybeInitiateSync()
        scheduler.waitForIdle()
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
    }

    @Ignore("b/157188866 - remove onReady from write-only handles")
    @Test
    fun initiatingSyncWhenNotPreparedDoesNotSendSyncRequest() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)

        // No readable handles are observing this proxy; sync request should not be sent.
        proxy.maybeInitiateSync()
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
    }

    @Test
    fun cannotAddActionsOnNonSyncingProxy() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)

        val check = { block: () -> Unit ->
            val exception = assertFailsWith<IllegalStateException> { block() }
            assertThat(exception).hasMessageThat().startsWith("Action handlers are not valid")
        }
        check { proxy.addOnReady(callbackId) {} }
        check { proxy.addOnUpdate(callbackId) {} }
        check { proxy.addOnDesync(callbackId) {} }
        check { proxy.addOnResync(callbackId) {} }
    }

    @Test
    fun addingActionsInvokesCallbacksBasedOnState() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)

        // READY_TO_SYNC and AWAITING_SYNC: none of the callbacks are invoked immediately.
        proxy.prepareForSync()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
        val (onReady1, onUpdate1, onDesync1, onResync1) = addAllActions(callbackId, proxy)
        verifyNoMoreInteractions(onReady1, onUpdate1, onDesync1, onResync1)

        proxy.maybeInitiateSync()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
        val (onReady2, onUpdate2, onDesync2, onResync2) = addAllActions(callbackId, proxy)
        verifyNoMoreInteractions(onReady2, onUpdate2, onDesync2, onResync2)

        // SYNC: addOnReady should invoke its callback immediately.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)

        val (onReady3, onUpdate3, onDesync3, onResync3) = addAllActions(callbackId, proxy)
        verify(onReady3).invoke()
        verifyNoMoreInteractions(onUpdate3, onDesync3, onResync3)

        // DESYNC: addOnDesync should invoke its callback immediately.
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(false)
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation),null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)

        val (onReady4, onUpdate4, onDesync4, onResync4) = addAllActions(callbackId, proxy)
        verify(onDesync4).invoke()
        verifyNoMoreInteractions(onReady4, onUpdate4, onResync4)
    }

    @Test
    fun storageEvents() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val notify: (StorageEvent) -> Unit = mock()
        proxy.registerForStorageEvents(callbackId, notify)

        // NO_SYNC, READY_TO_SYNC, AWAITING_SYNC: should not notify.
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)
        proxy.prepareForSync()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
        proxy.maybeInitiateSync()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
        verifyNoMoreInteractions(notify)

        // SYNC: should notify READY.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verify(notify).invoke(StorageEvent.READY)

        whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
            .thenReturn(true)
            .thenReturn(false)

        // Successful model ops should notify UPDATE.
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
        scheduler.waitForIdle()
        verify(notify).invoke(StorageEvent.UPDATE)

        // Failing model ops should notify DESYNC.
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation),null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
        verify(notify).invoke(StorageEvent.DESYNC)

        // Syncing the proxy again should notify RESYNC.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verify(notify).invoke(StorageEvent.RESYNC)
    }

    @Test
    fun modelUpdatesTriggerOnReadyThenOnUpdate() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        proxy.maybeInitiateSync()

        val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)

        // Send a model update to sync the proxy.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verify(onReady).invoke()

        // Sending another model should trigger the onUpdate callback.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verify(onUpdate).invoke("data")
        verifyNoMoreInteractions(onReady, onDesync, onResync)
    }

    @Test
    fun modelOperationsTriggerOnUpdate() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        proxy.maybeInitiateSync()

        val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(true)

        // Ops should be ignored prior to syncing.
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
        verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)

        // Sync the proxy.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verify(onReady).invoke()

        // Sending ops after syncing should trigger the onUpdate callback; also check that multiple
        // successful ops are processed.
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation, mockCrdtOperation), null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verify(onUpdate).invoke("data")
        verifyNoMoreInteractions(onReady, onDesync, onResync)
    }

    @Test
    fun failingModelOperationsTriggerDesync() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        proxy.maybeInitiateSync()

        // Sync the proxy.
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verify(onReady).invoke()

        // First ops received fails to apply, second would succeed but should be ignored.
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
            .thenReturn(false)
            .thenReturn(true)

        // Failure to apply ops should trigger onDesync and send a sync request.
        fakeStoreEndpoint.clearProxyMessages()
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))

        fakeStoreEndpoint.waitFor(
            ProxyMessage.SyncRequest(null)
        )
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
        scheduler.waitForIdle()
        verify(onDesync).invoke()

        // Ops should be ignored when desynced.
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
        verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)

        // Syncing the proxy again should trigger onResync.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verify(onResync).invoke()
        verifyNoMoreInteractions(onReady, onUpdate, onDesync)
    }

    @Ignore("b/157267383 - Deflake")
    @Test
    fun listOfModelOperationsWithOneFailing() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        proxy.maybeInitiateSync()

        // Sync the proxy.
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verify(onReady).invoke()

        // When the second op fails, no further ops will be processed and the proxy should desync.
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
            .thenReturn(true)
            .thenReturn(false)
            .thenThrow(IllegalStateException("should not be reached"))

        fakeStoreEndpoint.clearProxyMessages()
        val threeOps = listOf(mockCrdtOperation, mockCrdtOperation, mockCrdtOperation)
        proxy.onMessage(ProxyMessage.Operations(threeOps,null))
        scheduler.waitForIdle()

        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
        verify(onDesync).invoke()
        verifyNoMoreInteractions(onReady, onUpdate, onResync)
    }

    @Test
    fun syncRequestReturnsTheLocalModel() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        proxy.maybeInitiateSync()

        val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)

        // Wait until the sync request appears, then get rid of it so we can test for the
        // existence of the model update message in response to a store trying to sync.
        scheduler.waitForIdle()
        fakeStoreEndpoint.clearProxyMessages()

        proxy.onMessage(ProxyMessage.SyncRequest(null))
        fakeStoreEndpoint.waitFor(ProxyMessage.ModelUpdate(mockCrdtData, null))
        verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)
    }

    @Test
    fun removeCallbacksForName() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        proxy.maybeInitiateSync()

        // First sync usually triggers onReady.
        val (onReady1, onUpdate1, onDesync1, onResync1) = addAllActions(callbackId, proxy)
        proxy.removeCallbacksForName(callbackId)
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verifyNoMoreInteractions(onReady1, onUpdate1, onDesync1, onResync1)

        whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
            .thenReturn(true)
            .thenReturn(false)

        // Successful model ops usually trigger onUpdate.
        val (onReady2, onUpdate2, onDesync2, onResync2) = addAllActions(callbackId, proxy)
        scheduler.waitForIdle()

        verify(onReady2).invoke()  // immediate callback when synced
        proxy.removeCallbacksForName(callbackId)
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation),null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verifyNoMoreInteractions(onReady2, onUpdate2, onDesync2, onResync2)

        // Failed model ops usually trigger onDesync.
        val (onReady3, onUpdate3, onDesync3, onResync3) = addAllActions(callbackId, proxy)
        scheduler.waitForIdle()

        verify(onReady3).invoke()  // immediate callback when synced
        proxy.removeCallbacksForName(callbackId)
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation),null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
        verifyNoMoreInteractions(onReady3, onUpdate3, onDesync3, onResync3)

        // Subsequent sync usually trigger onResync.
        val (onReady4, onUpdate4, onDesync4, onResync4) = addAllActions(callbackId, proxy)
        scheduler.waitForIdle()

        verify(onDesync4).invoke()  // immediate callback when desynced
        proxy.removeCallbacksForName(callbackId)
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        verifyNoMoreInteractions(onReady4, onUpdate4, onDesync4, onResync4)
    }

    @Ignore("b/157168120 - Deflake")
    @Test
    fun applyOpSucceeds() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        proxy.maybeInitiateSync()

        val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(true)

        fakeStoreEndpoint.clearProxyMessages()
        assertThat(proxy.applyOp(mockCrdtOperation).await()).isTrue()
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.Operations<CrdtData, CrdtOperation, String>(
                listOf(mockCrdtOperation), null
            )
        )

        scheduler.waitForIdle()

        verify(onUpdate).invoke("data")
        verifyNoMoreInteractions(onReady, onDesync, onResync)
    }

    @Test
    fun applyOpFails() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        proxy.maybeInitiateSync()

        val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(false)

        // Wait for sync, then clear it.
        scheduler.waitForIdle()
        fakeStoreEndpoint.clearProxyMessages()

        assertThat(proxy.applyOp(mockCrdtOperation).await()).isFalse()
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
        verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)
    }

    @Test
    fun getParticleViewReturnsSyncedState() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        proxy.maybeInitiateSync()
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)

        fakeStoreEndpoint.clearProxyMessages()
        assertThat(proxy.getParticleView()).isEqualTo("data")
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
    }

    @Ignore("b/157266813 - Deflake")
    @Test
    fun getParticleViewWhenNotSyncingFails() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)

        val exception = assertFailsWith<IllegalStateException> {
            proxy.getParticleViewAsync()
        }
        assertThat(exception).hasMessageThat()
            .isEqualTo("getParticleView not valid on non-readable StorageProxy")
    }

    @Test
    fun getParticleViewWhenReadyToSyncQueuesAndRequestsSync() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)

        val future1 = proxy.getParticleViewAsync()
        assertThat(future1.isCompleted).isFalse()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)

        scheduler.waitForIdle()
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )

        // Test that multiple futures can be returned and resolved.
        val future2 = proxy.getParticleViewAsync()
        assertThat(future2.isCompleted).isFalse()

        // Syncing the proxy should resolve the futures.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        assertThat(future1.isCompleted).isTrue()
        assertThat(future1.await()).isEqualTo("data")
        assertThat(future2.isCompleted).isTrue()
        assertThat(future2.await()).isEqualTo("data")
    }

    @Ignore("b/157266894 - Deflake")
    @Test
    fun getParticleViewWhenDesyncedQueues() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.prepareForSync()
        proxy.maybeInitiateSync()
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)

        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(false)
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation),null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)

        fakeStoreEndpoint.clearProxyMessages()
        val future = proxy.getParticleViewAsync()
        assertThat(future.isCompleted).isFalse()
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()

        // Syncing the proxy should resolve the future.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        assertThat(future.isCompleted).isTrue()
        assertThat(future.await()).isEqualTo("data")
    }

    @Test
    fun getVersionMap() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val versionMap = VersionMap(mapOf("x" to 7))
        whenever(mockCrdtModel.versionMap).thenReturn(versionMap)
        val proxyMap = proxy.getVersionMap()
        assertThat(proxyMap).isEqualTo(versionMap)

        // The returned map should be a copy; modifying shouldn't change the proxy instance.
        proxyMap["y"] = 3
        assertThat(proxyMap).isNotEqualTo(proxy.getVersionMap())
    }

    @Test
    fun closeStorageProxy_closesStoreEndpoint() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.close()
        assertThat(fakeStoreEndpoint.closed).isTrue()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.CLOSED)
    }

    // Convenience wrapper for destructuring.
    private data class ActionMocks (
        val onReady: () -> Unit = mock(),
        val onUpdate: (String) -> Unit = mock(),
        val onDesync: () -> Unit = mock(),
        val onResync: () -> Unit = mock()
    )

    private suspend fun addAllActions(
        id: StorageProxy.CallbackIdentifier,
        proxy: StorageProxy<CrdtData, CrdtOperationAtTime, String>
    ): ActionMocks {
        val mocks = ActionMocks().also { mocks ->
            proxy.addOnReady(id) { mocks.onReady() }
            proxy.addOnUpdate(id) { mocks.onUpdate(it) }
            proxy.addOnDesync(id) { mocks.onDesync() }
            proxy.addOnResync(id) { mocks.onResync() }
        }
        scheduler.waitForIdle()
        return mocks
    }
}
