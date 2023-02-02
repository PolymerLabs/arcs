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

import arcs.core.analytics.Analytics
import arcs.core.common.ArcId
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.VersionMap
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.storage.StorageProxyImpl.ProxyState
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.type.Type
import arcs.core.util.ArcsStrictMode
import arcs.core.util.Scheduler
import arcs.core.util.Time
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.never
import com.nhaarman.mockitokotlin2.reset
import com.nhaarman.mockitokotlin2.times
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import com.nhaarman.mockitokotlin2.whenever
import java.util.concurrent.Executors
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Before
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.MockitoAnnotations

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class StorageProxyImplTest {
  @get:Rule
  val log = LogRule()

  private val fakeStoreEndpoint = StoreEndpointFake<CrdtData, CrdtOperation, String>()
  private val fakeStorageEndpointManager = FakeStorageEndpointManager(fakeStoreEndpoint)

  @Mock
  private lateinit var mockCrdtOperation: CrdtOperation

  @Mock
  private lateinit var mockCrdtModel: CrdtModel<CrdtData, CrdtOperation, String>

  @Mock
  private lateinit var mockCrdtData: CrdtData

  @Mock
  private lateinit var mockTime: Time

  @Mock
  private lateinit var mockAnalytics: Analytics

  @Mock
  private lateinit var mockStorageKey: StorageKey

  @Mock
  private lateinit var mockType: Type

  private lateinit var scheduler: Scheduler
  private val callbackId = StorageProxy.CallbackIdentifier("test")

  @Before
  fun setup() {
    scheduler = Scheduler(Executors.newSingleThreadExecutor().asCoroutineDispatcher() + Job())
    MockitoAnnotations.initMocks(this)
    setupMockModel()
    whenever(mockCrdtOperation.versionMap).thenReturn(VersionMap())
  }

  @After
  fun tearDown() = runBlocking {
    scheduler.waitForIdle()
    scheduler.cancel()
  }

  private fun setupMockModel() {
    reset(mockCrdtModel)
    whenever(mockCrdtModel.data).thenReturn(mockCrdtData)
    whenever(mockCrdtModel.versionMap).thenReturn(VersionMap())
    whenever(mockCrdtModel.consumerView).thenReturn("data")
  }

  private suspend fun mockProxy() = StorageProxyImpl.create(
    StoreOptions(
      storageKey = mockStorageKey,
      type = mockType
    ),
    fakeStorageEndpointManager,
    mockCrdtModel,
    scheduler,
    mockTime
  )

  @Test
  fun initiatingSyncWhenPreparedSendsSyncRequest() = runTest {
    val proxy = mockProxy()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)

    // Readable handles are observing this proxy.
    proxy.prepareForSync()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
    proxy.prepareForSync()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
    proxy.awaitOutgoingMessageQueueDrain()
    assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()

    // Sync request should be sent.
    proxy.maybeInitiateSync()
    scheduler.waitForIdle()
    proxy.awaitOutgoingMessageQueueDrain()
    assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
      ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
    )
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
  }

  @Ignore("b/157188866 - remove onReady from write-only handles")
  @Test
  fun initiatingSyncWhenNotPreparedDoesNotSendSyncRequest() = runTest {
    val proxy = mockProxy()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)

    // No readable handles are observing this proxy; sync request should not be sent.
    proxy.maybeInitiateSync()
    scheduler.waitForIdle()
    proxy.awaitOutgoingMessageQueueDrain()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)
    assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
  }

  @Test
  fun cannotAddActionsOnNonSyncingProxy() = runTest {
    val proxy = mockProxy()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)

    val check = { block: () -> Unit ->
      val exception = assertFailsWith<IllegalStateException> { block() }
      assertThat(exception).hasMessageThat().startsWith("Action handlers are not valid")
    }
    check { proxy.addOnReady(callbackId) {} }
    check { proxy.addOnUpdate(callbackId) { _, _ -> Unit } }
    check { proxy.addOnDesync(callbackId) {} }
    check { proxy.addOnResync(callbackId) {} }
  }

  @Test
  fun addingActionsInvokesCallbacksBasedOnState() = runTest {
    val proxy = mockProxy()
    // READY_TO_SYNC and AWAITING_SYNC: none of the callbacks are invoked immediately.
    proxy.prepareForSync()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
    val (onReady1, onUpdate1, onDesync1, onResync1) = addAllActions(callbackId, proxy)
    verifyNoMoreInteractions(onReady1, onUpdate1, onDesync1, onResync1)

    proxy.maybeInitiateSync()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
    val (onReady2, onUpdate2, onDesync2, onResync2, channels2) =
      addAllActions(callbackId, proxy)
    verifyNoMoreInteractions(onReady2, onUpdate2, onDesync2, onResync2)

    // SYNC: addOnReady should invoke its callback immediately.
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()
    channels2.onReady.receiveOrTimeout()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)

    val (onReady3, onUpdate3, onDesync3, onResync3, channels3) =
      addAllActions(callbackId, proxy)
    scheduler.waitForIdle()
    channels3.onReady.receiveOrTimeout()
    verify(onReady3).invoke()
    verifyNoMoreInteractions(onUpdate3, onDesync3, onResync3)

    // DESYNC: addOnDesync should invoke its callback immediately.
    whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(false)
    proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
    channels3.onDesync.receiveOrTimeout()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)

    val (onReady4, onUpdate4, onDesync4, onResync4, channels4) =
      addAllActions(callbackId, proxy)
    scheduler.waitForIdle()

    channels4.onDesync.receiveOrTimeout()
    verify(onDesync4).invoke()
    verifyNoMoreInteractions(onReady4, onUpdate4, onResync4)
  }

  @Test
  fun storageEvents() = runTest {
    val proxy = mockProxy()
    val notifyChannel = Channel<StorageEvent>(Channel.BUFFERED)
    proxy.registerForStorageEvents(callbackId) {
      runBlocking { notifyChannel.send(it) }
    }

    // NO_SYNC, READY_TO_SYNC, AWAITING_SYNC: should not notify.
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)
    proxy.prepareForSync()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
    proxy.maybeInitiateSync()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
    assertThat(notifyChannel.isEmpty).isTrue()

    // SYNC: should notify READY.
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.READY)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)

    whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
      .thenReturn(true)
      .thenReturn(false)

    // Successful model ops should notify UPDATE.
    proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.UPDATE)

    // Failing model ops should notify DESYNC.
    proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.DESYNC)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)

    // Syncing the proxy again should notify RESYNC.
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.RESYNC)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
  }

  @Test
  fun modelUpdatesTriggerOnReadyThenOnUpdate() = runTest {
    val proxy = mockProxy()
    proxy.prepareForSync()
    proxy.maybeInitiateSync()

    val (onReady, onUpdate, onDesync, onResync, channels) = addAllActions(callbackId, proxy)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)

    // Send a model update to sync the proxy.
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))

    channels.onReady.receiveOrTimeout()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verify(onReady).invoke()

    // Sending another model should trigger the onUpdate callback only if the data changed.
    whenever(mockCrdtModel.consumerView).thenReturn("blah")
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))

    channels.onUpdate.receiveOrTimeout()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verify(onUpdate).invoke("blah")
    verifyNoMoreInteractions(onReady, onDesync, onResync)
  }

  @Test
  fun modelOperationsTriggerOnUpdate() = runTest {
    val proxy = mockProxy()
    proxy.prepareForSync()
    proxy.maybeInitiateSync()

    val (onReady, onUpdate, onDesync, onResync, channels) = addAllActions(callbackId, proxy)
    whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(true)

    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)
    verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)

    // Sync the proxy.
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))

    channels.onReady.receiveOrTimeout()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verify(onReady).invoke()

    // Sending ops after syncing should trigger the onUpdate callback; also check that multiple
    // successful ops are processed.
    proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation, mockCrdtOperation), null))

    channels.onUpdate.receiveOrTimeout()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verify(onUpdate).invoke("data")
    verifyNoMoreInteractions(onReady, onDesync, onResync)
  }

  @Test
  fun failingModelOperationsTriggerDesync() = runTest {
    val proxy = mockProxy()
    val notifyChannel = Channel<StorageEvent>(Channel.BUFFERED)
    proxy.registerForStorageEvents(callbackId) {
      runBlocking { notifyChannel.send(it) }
    }
    proxy.prepareForSync()
    proxy.maybeInitiateSync()

    // Sync the proxy.
    val (onReady, onUpdate, onDesync, onResync, channels) = addAllActions(callbackId, proxy)
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.READY)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verify(onReady).invoke()

    // First ops received fails to apply, second would succeed but should be ignored.
    whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
      .thenReturn(false)
      .thenReturn(true)

    // Failure to apply ops should trigger onDesync and send a sync request.
    proxy.awaitOutgoingMessageQueueDrain()
    fakeStoreEndpoint.clearProxyMessages()
    proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))

    proxy.awaitOutgoingMessageQueueDrain()
    fakeStoreEndpoint.waitFor(ProxyMessage.SyncRequest(null))
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.DESYNC)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
    scheduler.waitForIdle()
    channels.onDesync.receiveOrTimeout()
    verify(onDesync).invoke()

    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
    verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)

    // Syncing the proxy again should trigger onResync.
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()

    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.RESYNC)
    channels.onResync.receiveOrTimeout()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verify(onResync).invoke()
    verify(onUpdate).invoke("data")
    verifyNoMoreInteractions(onReady, onDesync)
  }

  @Test
  fun listOfModelOperationsWithOneFailing() = runTest {
    val proxy = mockProxy()
    proxy.prepareForSync()
    proxy.maybeInitiateSync()

    // Sync the proxy.
    val (onReady, onUpdate, onDesync, onResync, channels) = addAllActions(callbackId, proxy)
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))

    channels.onReady.receiveOrTimeout()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verify(onReady).invoke()

    // When the second op fails, no further ops will be processed and the proxy should desync.
    whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
      .thenReturn(true)
      .thenReturn(false)
      .thenThrow(IllegalStateException("should not be reached"))

    proxy.awaitOutgoingMessageQueueDrain()
    fakeStoreEndpoint.clearProxyMessages()
    val threeOps = listOf(mockCrdtOperation, mockCrdtOperation, mockCrdtOperation)
    proxy.onMessage(ProxyMessage.Operations(threeOps, null))

    channels.onDesync.receiveOrTimeout()
    proxy.awaitOutgoingMessageQueueDrain()
    assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
      ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
    )
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
    verify(onDesync).invoke()
    verifyNoMoreInteractions(onReady, onUpdate, onResync)
  }

  @Test
  fun syncRequestReturnsTheLocalModel() = runTest {
    val proxy = mockProxy()
    proxy.prepareForSync()
    proxy.maybeInitiateSync()

    val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)

    // Wait until the sync request appears, then get rid of it so we can test for the
    // existence of the model update message in response to a store trying to sync.
    scheduler.waitForIdle()
    fakeStoreEndpoint.clearProxyMessages()

    proxy.onMessage(ProxyMessage.SyncRequest(null))
    proxy.awaitOutgoingMessageQueueDrain()
    fakeStoreEndpoint.waitFor(ProxyMessage.ModelUpdate(mockCrdtData, null))
    verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)
  }

  @Test
  fun removeCallbacksForName() = runTest {
    val proxy = mockProxy()
    val notifyChannel = Channel<StorageEvent>(Channel.BUFFERED)
    proxy.registerForStorageEvents(StorageProxy.CallbackIdentifier("dontRemoveMe")) {
      runBlocking { notifyChannel.send(it) }
    }
    proxy.prepareForSync()
    proxy.maybeInitiateSync()

    // First sync usually triggers onReady.
    val (onReady1, onUpdate1, onDesync1, onResync1) = addAllActions(callbackId, proxy)
    proxy.removeCallbacksForName(callbackId)
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()

    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.READY)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verifyNoMoreInteractions(onReady1, onUpdate1, onDesync1, onResync1)

    whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
      .thenReturn(true)
      .thenReturn(false)

    // Successful model ops usually trigger onUpdate.
    val (onReady2, onUpdate2, onDesync2, onResync2) = addAllActions(callbackId, proxy)
    scheduler.waitForIdle()

    verify(onReady2).invoke() // immediate callback when synced
    proxy.removeCallbacksForName(callbackId)
    proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
    scheduler.waitForIdle()

    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.UPDATE)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verifyNoMoreInteractions(onReady2, onUpdate2, onDesync2, onResync2)

    // Failed model ops usually trigger onDesync.
    val (onReady3, onUpdate3, onDesync3, onResync3) = addAllActions(callbackId, proxy)
    scheduler.waitForIdle()

    verify(onReady3).invoke() // immediate callback when synced
    proxy.removeCallbacksForName(callbackId)
    proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
    scheduler.waitForIdle()

    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.DESYNC)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
    verifyNoMoreInteractions(onReady3, onUpdate3, onDesync3, onResync3)

    // Subsequent sync usually trigger onResync.
    val (onReady4, onUpdate4, onDesync4, onResync4, channels) = addAllActions(callbackId, proxy)
    scheduler.waitForIdle()

    channels.onDesync.receiveOrTimeout()
    verify(onDesync4).invoke() // immediate callback when desynced
    proxy.removeCallbacksForName(callbackId)
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()

    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.RESYNC)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verifyNoMoreInteractions(onReady4, onUpdate4, onDesync4, onResync4)
  }

  @Test
  fun applyOpSucceeds() = runTest {
    val proxy = mockProxy()
    proxy.prepareForSync()
    proxy.maybeInitiateSync()

    val (onReady, onUpdate, onDesync, onResync, channels) = addAllActions(callbackId, proxy)
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()
    fakeStoreEndpoint.waitFor(ProxyMessage.SyncRequest(null))
    fakeStoreEndpoint.clearProxyMessages()
    channels.onReady.receiveOrTimeout()
    verify(onReady).invoke()

    whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(true)
    assertThat(proxy.applyOp(mockCrdtOperation).await()).isTrue()
    assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
      ProxyMessage.Operations<CrdtData, CrdtOperation, String>(
        listOf(mockCrdtOperation), null
      )
    )

    channels.onUpdate.receiveOrTimeout()
    verify(onUpdate).invoke("data")
    verifyNoMoreInteractions(onReady, onDesync, onResync)
  }

  @Test
  fun applyOpFails() = runTest {
    val proxy = mockProxy()
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
  fun applyOpsSucceeds() = runTest {
    val proxy = mockProxy()
    proxy.prepareForSync()
    proxy.maybeInitiateSync()

    val (onReady, onUpdate, onDesync, onResync, channels) = addAllActions(callbackId, proxy)
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()
    fakeStoreEndpoint.waitFor(ProxyMessage.SyncRequest(null))
    fakeStoreEndpoint.clearProxyMessages()
    channels.onReady.receiveOrTimeout()
    verify(onReady).invoke()

    whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(true)
    assertThat(proxy.applyOps(listOf(mockCrdtOperation, mockCrdtOperation)).await()).isTrue()
    assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
      ProxyMessage.Operations<CrdtData, CrdtOperation, String>(
        listOf(mockCrdtOperation, mockCrdtOperation), null
      )
    )

    channels.onUpdate.receiveOrTimeout()
    verify(onUpdate).invoke("data")
    verifyNoMoreInteractions(onReady, onDesync, onResync)
  }

  @Test
  fun applyOpsFails() = runTest {
    val proxy = mockProxy()
    proxy.prepareForSync()
    proxy.maybeInitiateSync()

    val (onReady, onUpdate, onDesync, onResync) = addAllActions(callbackId, proxy)
    whenever(mockCrdtModel.applyOperation(mockCrdtOperation))
      .thenReturn(true).thenReturn(false)

    // Wait for sync, then clear it.
    scheduler.waitForIdle()
    fakeStoreEndpoint.clearProxyMessages()

    assertThat(proxy.applyOps(listOf(mockCrdtOperation, mockCrdtOperation)).await()).isFalse()
    assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
    verifyNoMoreInteractions(onReady, onUpdate, onDesync, onResync)
  }

  @Test
  fun getVersionMap() = runTest {
    val proxy = mockProxy()
    val versionMap = VersionMap(mapOf("x" to 7))
    whenever(mockCrdtModel.versionMap).thenReturn(versionMap)
    val proxyMap = proxy.getVersionMap()
    assertThat(proxyMap).isEqualTo(versionMap)

    // The returned map should be a copy; modifying shouldn't change the proxy instance.
    proxyMap["y"] = 3
    assertThat(proxyMap).isNotEqualTo(proxy.getVersionMap())
  }

  @Test
  fun closeStorageProxy_closesStoreEndpoint() = runTest {
    val proxy = mockProxy()
    proxy.close()
    assertThat(fakeStoreEndpoint.closed).isTrue()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.CLOSED)
  }

  @Test
  fun proxyIgnoresModelUpdatesInNoSyncState() = runTest {
    val proxy = mockProxy()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)

    // Send an update before the proxy been asked to prepare for sync; the
    // underlying model should *not* have merge called.
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()

    proxy.prepareForSync()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
    scheduler.waitForIdle()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
    verify(mockCrdtModel, never()).merge(any())
    // Move the proxy to AWAITING_SYNC; it is now expecting to receive a sync.
    proxy.maybeInitiateSync()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)

    // Send the sync. The model should be merged.
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verify(mockCrdtModel).merge(eq(mockCrdtData))
  }

  @Test
  fun proxyIgnoresModelUpdatesInReadyToSyncState() = runTest {
    val proxy = mockProxy()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.NO_SYNC)

    proxy.prepareForSync()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)

    // Send an update before the proxy has been told to send a sync request; the
    // underlying model should *not* have merge called.
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.READY_TO_SYNC)
    verify(mockCrdtModel, never()).merge(any())

    // Move the proxy to AWAITING_SYNC; it is now expecting to receive a sync.
    proxy.maybeInitiateSync()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.AWAITING_SYNC)

    // Send the sync. The model should be merged.
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)
    verify(mockCrdtModel).merge(eq(mockCrdtData))
  }

  @Test
  fun opsReceived_beforeSync_areAppliedAfter_sync() = runTest {
    val proxy = mockProxy()
    val notifyChannel = Channel<StorageEvent>(Channel.BUFFERED)
    proxy.registerForStorageEvents(callbackId) {
      runBlocking { notifyChannel.send(it) }
    }
    proxy.prepareForSync()

    // Now send a message, it should not be applied.
    proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
    proxy.awaitOutgoingMessageQueueDrain()
    scheduler.waitForIdle()
    assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
    verify(mockCrdtModel, never()).applyOperation(any())

    // Sync it.
    proxy.maybeInitiateSync()
    proxy.awaitOutgoingMessageQueueDrain()
    fakeStoreEndpoint.waitFor(ProxyMessage.SyncRequest(null))
    fakeStoreEndpoint.clearProxyMessages()
    whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(true)
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.READY)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)

    // After applying the model update, we should have also applied the operation.
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.UPDATE)
    verify(mockCrdtModel).merge(eq(mockCrdtData))
  }

  @Test
  fun opsReceived_whileDesynced_areAppliedAfter_resync() = runTest {
    val proxy = mockProxy()
    val notifyChannel = Channel<StorageEvent>(Channel.BUFFERED)
    proxy.registerForStorageEvents(callbackId) {
      runBlocking { notifyChannel.send(it) }
    }
    proxy.prepareForSync()
    proxy.maybeInitiateSync()

    // Initialize
    proxy.awaitOutgoingMessageQueueDrain()
    fakeStoreEndpoint.waitFor(ProxyMessage.SyncRequest(null))
    fakeStoreEndpoint.clearProxyMessages()

    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.READY)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.SYNC)

    // Now de-sync it.
    setupMockModel()
    whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(false)
    proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.DESYNC)
    assertThat(proxy.getStateForTesting()).isEqualTo(ProxyState.DESYNC)
    proxy.awaitOutgoingMessageQueueDrain()
    fakeStoreEndpoint.waitFor(ProxyMessage.SyncRequest(null))
    fakeStoreEndpoint.clearProxyMessages()
    verify(mockCrdtModel).applyOperation(any())

    // Now send a message, it should not be applied.
    setupMockModel()
    proxy.onMessage(ProxyMessage.Operations(listOf(mockCrdtOperation), null))
    proxy.awaitOutgoingMessageQueueDrain()
    scheduler.waitForIdle()
    assertThat(fakeStoreEndpoint.getProxyMessages()).isEmpty()
    verify(mockCrdtModel, never()).applyOperation(any())

    // Send the re-sync ModelUpdate.
    setupMockModel()
    whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(true)
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.RESYNC)
    // After applying the model update, we should have also applied the operation.
    assertThat(notifyChannel.receiveOrTimeout()).isEqualTo(StorageEvent.UPDATE)
    verify(mockCrdtModel).merge(eq(mockCrdtData))
  }

  @Test
  fun syncRequestToModelUpdate_normalStorageKey_logged() = runTest {
    val volatileStorageKey = VolatileStorageKey(ArcId.newForTest("arcId"), "unique")

    val proxy = StorageProxyImpl.create(
      StoreOptions(
        storageKey = volatileStorageKey,
        type = mockType
      ),
      fakeStorageEndpointManager,
      mockCrdtModel,
      scheduler,
      mockTime,
      mockAnalytics
    )
    proxy.prepareForSync()
    proxy.awaitOutgoingMessageQueueDrain()

    // Return 2 as first timestamp.
    whenever(mockTime.currentTimeMillis).thenReturn(2)
    proxy.maybeInitiateSync()

    verify(mockTime, times(1)).currentTimeMillis

    // Return 98 as first timestamp.
    whenever(mockTime.currentTimeMillis).thenReturn(98)
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()
    verify(mockTime, times(2)).currentTimeMillis
    verify(mockAnalytics, times(1)).logStorageLatency(
      96 /* 98 - 2 */,
      Analytics.StorageType.VOLATILE,
      Analytics.HandleType.OTHER,
      Analytics.Event.SYNC_REQUEST_TO_MODEL_UPDATE
    )
  }

  @Test
  fun syncRequestToModelUpdate_referenceModeStorageKey_logged() = runTest {
    val dbBackingStorageKey = DatabaseStorageKey.Persistent("backing", "abc")
    val dbStorageKey = DatabaseStorageKey.Persistent("unique", "abc")

    val dbReferenceModeStorageKey =
      ReferenceModeStorageKey(dbBackingStorageKey, dbStorageKey)

    val proxy =
      StorageProxyImpl.create(
        StoreOptions(
          storageKey = dbReferenceModeStorageKey,
          type = mockType
        ),
        fakeStorageEndpointManager,
        mockCrdtModel,
        scheduler,
        mockTime,
        mockAnalytics
      )
    proxy.prepareForSync()
    proxy.awaitOutgoingMessageQueueDrain()

    // Return 2 as first timestamp.
    whenever(mockTime.currentTimeMillis).thenReturn(2)
    proxy.maybeInitiateSync()

    verify(mockTime, times(1)).currentTimeMillis

    // Return 97 as first timestamp.
    whenever(mockTime.currentTimeMillis).thenReturn(97)
    proxy.onMessage(ProxyMessage.ModelUpdate(mockCrdtData, null))
    scheduler.waitForIdle()
    verify(mockTime, times(2)).currentTimeMillis
    verify(mockAnalytics, times(1)).logStorageLatency(
      95 /* 97 - 2 */,
      Analytics.StorageType.REFERENCE_MODE_DATABASE,
      Analytics.HandleType.OTHER,
      Analytics.Event.SYNC_REQUEST_TO_MODEL_UPDATE
    )
  }

  /**
   * This test recreates the behavior which was causing an extremely rare test flake: if the
   * scheduler is shut down while a message is in flight, the busy flow might remain permanently
   * stuck at true, causing a hang during shutdown.
   */
  @Test
  fun awaitIdleDoesNotHangAfterSchedulerClose() = runTest {
    val proxy = mockProxy()
    val signalProxyMessageReceived = Job()
    val signalSchedulerCancelled = Job()
    whenever(mockCrdtModel.applyOperation(mockCrdtOperation)).thenReturn(true)
    fakeStoreEndpoint.onNextProxyMessage {
      signalProxyMessageReceived.complete()
      signalSchedulerCancelled.join()
    }
    proxy.applyOp(mockCrdtOperation)
    signalProxyMessageReceived.join()
    scheduler.cancel()
    signalSchedulerCancelled.complete()
    proxy.close()
  }

  // Convenience wrapper for destructuring.
  private data class ActionMocks(
    val onReady: () -> Unit = mock(),
    val onUpdate: (String) -> Unit = mock(),
    val onDesync: () -> Unit = mock(),
    val onResync: () -> Unit = mock(),
    val channels: ActionChannels
  )

  private data class ActionChannels(
    val onReady: Channel<Unit> = Channel(Channel.BUFFERED),
    val onUpdate: Channel<Unit> = Channel(Channel.BUFFERED),
    val onDesync: Channel<Unit> = Channel(Channel.BUFFERED),
    val onResync: Channel<Unit> = Channel(Channel.BUFFERED)
  )

  private suspend fun addAllActions(
    id: StorageProxy.CallbackIdentifier,
    proxy: StorageProxyImpl<CrdtData, CrdtOperation, String>
  ): ActionMocks {
    val channels = ActionChannels()
    val mocks = ActionMocks(channels = channels).also { mocks ->
      proxy.addOnReady(id) {
        mocks.onReady()
        channels.onReady.offer(Unit)
      }
      proxy.addOnUpdate(id) { _, new ->
        mocks.onUpdate(new)
        channels.onUpdate.offer(Unit)
      }
      proxy.addOnDesync(id) {
        mocks.onDesync()
        channels.onDesync.offer(Unit)
      }
      proxy.addOnResync(id) {
        mocks.onResync()
        channels.onResync.offer(Unit)
      }
    }
    scheduler.waitForIdle()
    return mocks
  }

  private suspend fun <E> Channel<E>.receiveOrTimeout(timeout: Long = 5000): E =
    withTimeout(timeout) { receive() }

  private fun runTest(block: suspend CoroutineScope.() -> Unit) = runBlocking {
    // TODO(b/161494972): remove this and fix the tests
    ArcsStrictMode.disableStrictHandles()
    withTimeout(5000) { this.block() }
  }
}
