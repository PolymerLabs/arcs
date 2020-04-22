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
import arcs.core.util.Scheduler
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import com.nhaarman.mockitokotlin2.whenever
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
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

    private val scheduler: Scheduler = Scheduler(JvmTime, EmptyCoroutineContext)

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
    fun addOnReadyTriggersSyncRequest() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val callbackId = StorageProxy.CallbackIdentifier("test")
        proxy.addOnReady(callbackId) {}

        delay(100)

        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
    }

    @Test
    fun addOnUpdateTriggersSyncRequest() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val callbackId = StorageProxy.CallbackIdentifier("test")
        proxy.addOnUpdate(callbackId) {}

        delay(100)

        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
    }

    @Test
    fun addOnDesyncTriggersSyncRequest() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val callbackId = StorageProxy.CallbackIdentifier("test")
        proxy.addOnDesync(callbackId) {}

        delay(100)

        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
    }

    @Test
    fun addOnResyncTriggersSyncRequest() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val callbackId = StorageProxy.CallbackIdentifier("test")
        proxy.addOnResync(callbackId) {}

        delay(100)

        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
    }

    @Test
    fun onlyOneSyncRequestIsSentWhenAddingMultipleActions() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val callbackId = StorageProxy.CallbackIdentifier("test")
        proxy.addOnReady(callbackId) {}
        proxy.addOnUpdate(callbackId) {}
        proxy.addOnDesync(callbackId) {}
        proxy.addOnResync(callbackId) {}
        scheduler.waitForIdle()
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
    }

    @Test
    fun addingActionsInvokesCallbacksBasedOnState() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val callbackId = StorageProxy.CallbackIdentifier("test")
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.INIT)

        // In INIT and AWAITING_SYNC, none of the notifiers are invoked immediately.
        val (onReady1, onUpdate1, onDesync1, onResync1) = addAllActions(callbackId, proxy)
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
        verifyNoMoreInteractions(onReady1, onUpdate1, onDesync1, onResync1)

        // In SYNC, addOnReady should invoke its callback immediately.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)

        val (onReady2, onUpdate2, onDesync2, onResync2) = addAllActions(callbackId, proxy)
        scheduler.waitForIdle()
        verify(onReady2).invoke()
        verifyNoMoreInteractions(onUpdate2, onDesync2, onResync2)

        // In DESYNC, addOnDesync should invoke its callback immediately.
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(false)
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation),null))
        scheduler.waitForIdle()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)

        val (onReady3, onUpdate3, onDesync3, onResync3) = addAllActions(callbackId, proxy)
        scheduler.waitForIdle()
        verify(onDesync3).invoke()
        verifyNoMoreInteractions(onReady3, onUpdate3, onResync3)

        scheduler.scope.cancel()
    }

    @Test
    fun modelUpdatesTriggerOnReadyThenOnUpdate() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val callbackId = StorageProxy.CallbackIdentifier("test")
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
        val callbackId = StorageProxy.CallbackIdentifier("test")
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
        val callbackId = StorageProxy.CallbackIdentifier("test")
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)

        // Sync the proxy.
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
        scheduler.waitForIdle()

        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
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

    @Test
    fun listOfModelOperationsWithOneFailing() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val callbackId = StorageProxy.CallbackIdentifier("test")
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

        delay(100)

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
        val callbackId = StorageProxy.CallbackIdentifier("test")
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)

        // Wait until the sync request appears, then get rid of it so we can test for the
        // existence of the model update message in response to a store trying to sync.
        delay(100)
        fakeStoreEndpoint.clearProxyMessages()

        proxy.onMessage(ProxyMessage.SyncRequest(null))
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.ModelUpdate<CrdtData, CrdtOperation, String>(mockCrdtData, null)
        )
        verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)
    }

    @Test
    fun removeCallbacksForName() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val callbackId = StorageProxy.CallbackIdentifier("test", "test")

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

    @Test
    fun applyOpSucceeds() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        val callbackId = StorageProxy.CallbackIdentifier("test")
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
        val callbackId = StorageProxy.CallbackIdentifier("test")
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(false)

        delay(100) // Wait for sync, then clear it.
        fakeStoreEndpoint.clearProxyMessages()

        assertThat(proxy.applyOp(mockCrdtOperation).await()).isFalse()
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
        verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)
    }

    @Test
    fun getParticleViewReturnsSyncedState() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)

        fakeStoreEndpoint.clearProxyMessages()
        assertThat(proxy.getParticleView()).isEqualTo("data")
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
    }

    @Test
    fun getParticleViewWhenInInitialStateQueuesAndRequestsSync() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.INIT)

        val future1 = proxy.getParticleViewAsync()
        assertThat(future1.isCompleted).isFalse()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)

        delay(100) // wait for launch to have happened.

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

    @Test
    fun getParticleViewWhenAwaitingSyncQueues() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
        proxy.addOnReady(StorageProxy.CallbackIdentifier("test")) {}

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)

        delay(100)

        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperationAtTime, String>(null)
        )

        fakeStoreEndpoint.clearProxyMessages()

        val future = proxy.getParticleViewAsync()
        assertThat(future.isCompleted).isFalse()
        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()

        // Syncing the proxy should resolve the future.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        scheduler.waitForIdle()

        assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
        assertThat(future.isCompleted).isTrue()
        assertThat(future.await()).isEqualTo("data")
    }

    @Test
    fun getParticleViewWhenDesyncedQueues() = runBlocking {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel, scheduler)
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
        return ActionMocks().also { mocks ->
            proxy.addOnReady(id) { mocks.onReady() }
            proxy.addOnUpdate(id) { mocks.onUpdate(it) }
            proxy.addOnDesync(id) { mocks.onDesync() }
            proxy.addOnResync(id) { mocks.onResync() }
        }
    }
}
