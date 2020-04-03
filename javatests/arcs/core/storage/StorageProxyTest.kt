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
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import com.nhaarman.mockitokotlin2.whenever
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runBlockingTest
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
    fun addOnReadyTriggersSyncRequest() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        proxy.addOnReady("test") {}
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)
    }

    @Test
    fun addOnUpdateTriggersSyncRequest() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        proxy.addOnUpdate("test") {}
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)
    }

    @Test
    fun addOnDesyncTriggersSyncRequest() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        proxy.addOnDesync("test") {}
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)
    }

    @Test
    fun addOnResyncTriggersSyncRequest() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        proxy.addOnResync("test") {}
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)
    }

    @Test
    fun onlyOneSyncRequestIsSentWhenAddingMultipleActions() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        proxy.addOnReady("test") {}
        proxy.addOnUpdate("test") {}
        proxy.addOnDesync("test") {}
        proxy.addOnResync("test") {}
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)
    }

    @Test
    fun addingActionsInvokesCallbacksBasedOnState() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        assertThat(proxy.getStateForTesting() == ProxyState.INIT)

        // In INIT and AWAITING_SYNC, none of the notifiers are invoked immediately.
        val (onReady1, onUpdate1, onDesync1, onResync1) = addAllActions(proxy)
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)
        verifyNoMoreInteractions(onReady1, onUpdate1, onDesync1, onResync1)

        // In SYNC, addOnReady should invoke its callback immediately.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)

        val (onReady2, onUpdate2, onDesync2, onResync2) = addAllActions(proxy)
        verify(onReady2).invoke()
        verifyNoMoreInteractions(onUpdate2, onDesync2, onResync2)

        // In DESYNC, addOnDesync should invoke its callback immediately.
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(false)
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation),null))
        assertThat(proxy.getStateForTesting() == ProxyState.DESYNC)

        val (onReady3, onUpdate3, onDesync3, onResync3) = addAllActions(proxy)
        verify(onDesync3).invoke()
        verifyNoMoreInteractions(onReady3, onUpdate3, onResync3)
    }

    @Test
    fun modelUpdatesTriggerOnReadyThenOnUpdate() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(proxy)
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)

        // Send a model update to sync the proxy.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        verify(onReady).invoke()

        // Sending another model should trigger the onUpdate callback.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        verify(onUpdate).invoke("data")
        verifyNoMoreInteractions(onReady, onDesync, onResync)
    }

    @Test
    fun modelOperationsTriggerOnUpdate() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(proxy)
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(true)

        // Ops should be ignored prior to syncing.
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)
        verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)

        // Sync the proxy.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        verify(onReady).invoke()

        // Sending ops after syncing should trigger the onUpdate callback; also check that multiple
        // successful ops are processed.
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation, mockCrdtOperation), null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        verify(onUpdate).invoke("data")
        verifyNoMoreInteractions(onReady, onDesync, onResync)
    }

    @Test
    fun failingModelOperationsTriggerDesync() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(proxy)

        // Sync the proxy.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        verify(onReady).invoke()

        // First ops received fails to apply, second would succeed but should be ignored.
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
            .thenReturn(false)
            .thenReturn(true)

        // Failure to apply ops should trigger onDesync and send a sync request.
        fakeStoreEndpoint.clearProxyMessages()
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting() == ProxyState.DESYNC)
        verify(onDesync).invoke()

        // Ops should be ignored when desynced.
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
        assertThat(proxy.getStateForTesting() == ProxyState.DESYNC)
        verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)

        // Syncing the proxy again should trigger onResync.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        verify(onResync).invoke()
        verifyNoMoreInteractions(onReady, onUpdate, onDesync)
    }

    @Test
    fun listOfModelOperationsWithOneFailing() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(proxy)
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        verify(onReady).invoke()

        // When the second op fails, no further ops will be processed and the proxy should desync.
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
            .thenReturn(true)
            .thenReturn(false)
            .thenThrow(IllegalStateException("should not be reached"))

        fakeStoreEndpoint.clearProxyMessages()
        val threeOps = listOf(mockCrdtOperation, mockCrdtOperation, mockCrdtOperation)
        proxy.onMessage(ProxyMessage.Operations(threeOps,null))
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )
        assertThat(proxy.getStateForTesting() == ProxyState.DESYNC)
        verify(onDesync).invoke()
        verifyNoMoreInteractions(onReady, onUpdate, onResync)
    }

    @Test
    fun syncRequestReturnsTheLocalModel() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(proxy)

        fakeStoreEndpoint.clearProxyMessages()
        proxy.onMessage(ProxyMessage.SyncRequest(null))
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.ModelUpdate<CrdtData, CrdtOperation, String>(mockCrdtData, null)
        )
        verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)
    }

    @Test
    fun removeCallbacksForName() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)

        // First sync usually triggers onReady.
        val (onReady1, onUpdate1, onDesync1, onResync1) = addAllActions(proxy)
        proxy.removeCallbacksForName("test")
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        verifyNoMoreInteractions(onReady1, onUpdate1, onDesync1, onResync1)

        whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
            .thenReturn(true)
            .thenReturn(false)

        // Successful model ops usually trigger onUpdate.
        val (onReady2, onUpdate2, onDesync2, onResync2) = addAllActions(proxy)
        verify(onReady2).invoke()  // immediate callback when synced
        proxy.removeCallbacksForName("test")
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation),null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        verifyNoMoreInteractions(onReady2, onUpdate2, onDesync2, onResync2)

        // Failed model ops usually trigger onDesync.
        val (onReady3, onUpdate3, onDesync3, onResync3) = addAllActions(proxy)
        verify(onReady3).invoke()  // immediate callback when synced
        proxy.removeCallbacksForName("test")
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation),null))
        assertThat(proxy.getStateForTesting() == ProxyState.DESYNC)
        verifyNoMoreInteractions(onReady3, onUpdate3, onDesync3, onResync3)

        // Subsequent sync usually trigger onResync.
        val (onReady4, onUpdate4, onDesync4, onResync4) = addAllActions(proxy)
        verify(onDesync4).invoke()  // immediate callback when desynced
        proxy.removeCallbacksForName("test")
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        verifyNoMoreInteractions(onReady4, onUpdate4, onDesync4, onResync4)
    }

    @Test
    fun applyOpSucceeds() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(proxy)
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(true)

        fakeStoreEndpoint.clearProxyMessages()
        assertThat(proxy.applyOp(mockCrdtOperation)).isTrue()
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.Operations<CrdtData, CrdtOperation, String>(
                listOf(mockCrdtOperation), null
            )
        )
        verify(onUpdate).invoke("data")
        verifyNoMoreInteractions(onReady, onDesync, onResync)
    }

    @Test
    fun applyOpFails() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val (onReady, onUpdate, onDesync, onResync) = addAllActions(proxy)
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(false)

        fakeStoreEndpoint.clearProxyMessages()
        assertThat(proxy.applyOp(mockCrdtOperation)).isFalse()
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
        verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)
    }

    @Test
    fun getParticleViewReturnsSyncedState() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)

        fakeStoreEndpoint.clearProxyMessages()
        assertThat(proxy.getParticleView()).isEqualTo("data")
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
    }

    @Test
    fun getParticleViewWhenInInitialStateQueuesAndRequestsSync() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        assertThat(proxy.getStateForTesting() == ProxyState.INIT)

        val future1 = proxy.getParticleViewAsync()
        assertThat(future1.isCompleted).isFalse()
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)
        assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
            ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
        )

        // Test that multiple futures can be returned and resolved.
        val future2 = proxy.getParticleViewAsync()
        assertThat(future2.isCompleted).isFalse()

        // Syncing the proxy should resolve the futures.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        assertThat(future1.isCompleted).isTrue()
        assertThat(future1.await()).isEqualTo("data")
        assertThat(future2.isCompleted).isTrue()
        assertThat(future2.await()).isEqualTo("data")
    }

    @Test
    fun getParticleViewWhenAwaitingSyncQueues() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        proxy.addOnReady("test") {}
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)

        fakeStoreEndpoint.clearProxyMessages()
        val future = proxy.getParticleViewAsync()
        assertThat(future.isCompleted).isFalse()
        assertThat(proxy.getStateForTesting() == ProxyState.AWAITING_SYNC)
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()

        // Syncing the proxy should resolve the future.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        assertThat(future.isCompleted).isTrue()
        assertThat(future.await()).isEqualTo("data")
    }

    @Test
    fun getParticleViewWhenDesyncedQueues() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(false)
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation),null))
        assertThat(proxy.getStateForTesting() == ProxyState.DESYNC)

        fakeStoreEndpoint.clearProxyMessages()
        val future = proxy.getParticleViewAsync()
        assertThat(future.isCompleted).isFalse()
        assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()

        // Syncing the proxy should resolve the future.
        proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
        assertThat(proxy.getStateForTesting() == ProxyState.SYNC)
        assertThat(future.isCompleted).isTrue()
        assertThat(future.await()).isEqualTo("data")
    }

    @Test
    fun getVersionMap() = runBlockingTest {
        val proxy = StorageProxy(mockStorageEndpointProvider, mockCrdtModel)
        val versionMap = VersionMap(mapOf("x" to 7))
        whenever(mockCrdtModel.versionMap).thenReturn(versionMap)
        val proxyMap = proxy.getVersionMap()
        assertThat(proxyMap).isEqualTo(versionMap)

        // The returned map should be a copy; modifying shouldn't change the proxy instance.
        proxyMap["y"] = 3
        assertThat(proxyMap).isNotEqualTo(proxy.getVersionMap())
    }

    // Convenience wrapper for destructuring.
    private data class ActionMocks (
        val onReady: () -> Unit = mock(),
        val onUpdate: (String) -> Unit = mock(),
        val onDesync: () -> Unit = mock(),
        val onResync: () -> Unit = mock()
    )

    private suspend fun addAllActions(
        proxy: StorageProxy<CrdtData, CrdtOperationAtTime, String>
    ): ActionMocks {
        return ActionMocks().also { mocks ->
            proxy.addOnReady("test") { mocks.onReady() }
            proxy.addOnUpdate("test") { mocks.onUpdate(it) }
            proxy.addOnDesync("test") { mocks.onDesync() }
            proxy.addOnResync("test") { mocks.onResync() }
        }
    }
}
