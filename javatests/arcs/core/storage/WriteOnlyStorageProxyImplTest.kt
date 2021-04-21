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

import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.VersionMap
import arcs.core.storage.StorageProxy.CallbackIdentifier
import arcs.core.type.Type
import arcs.core.util.ArcsStrictMode
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.times
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import com.nhaarman.mockitokotlin2.whenever
import java.lang.IllegalStateException
import java.util.concurrent.Executors
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.Mockito.verifyZeroInteractions
import org.mockito.MockitoAnnotations

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class WriteOnlyStorageProxyImplTest {
  @get:Rule
  val log = LogRule()

  private val fakeStoreEndpoint = StoreEndpointFake<CrdtData, CrdtOperation, String>()
  private val fakeStorageEndpointManager = FakeStorageEndpointManager(fakeStoreEndpoint)

  @Mock
  private lateinit var mockCrdtOperation: CrdtOperation

  @Mock
  private lateinit var mockCrdtData: CrdtData

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
    whenever(mockCrdtOperation.versionMap).thenReturn(VersionMap())
  }

  @After
  fun tearDown() = runBlocking {
    scheduler.waitForIdle()
    scheduler.cancel()
  }

  private suspend fun mockProxy() =
    WriteOnlyStorageProxyImpl.create<CrdtData, CrdtOperation, String>(
      StoreOptions(
        storageKey = mockStorageKey,
        type = mockType
      ),
      fakeStorageEndpointManager,
      scheduler
    )

  @Test
  fun writeOnlyProxy_addOnUpdate_throws() = runTest {
    assertFailsWith<UnsupportedOperationException> {
      val proxy = mockProxy()
      proxy.addOnUpdate(callbackId) { _, _ -> }
    }
  }

  @Test
  fun writeOnlyProxy_addOnResync_throws() = runTest {
    assertFailsWith<UnsupportedOperationException> {
      val proxy = mockProxy()
      proxy.addOnResync(callbackId) { }
    }
  }

  @Test
  fun writeOnlyProxy_addOnDesync_throws() = runTest {
    assertFailsWith<UnsupportedOperationException> {
      val proxy = mockProxy()
      proxy.addOnDesync(callbackId) { }
    }
  }

  @Test
  fun writeOnlyProxy_addOnReady_throwsWhenClosed() = runTest {
    assertFailsWith<IllegalStateException> {
      val proxy = mockProxy()
      proxy.close()
      proxy.addOnReady(callbackId) { }
    }
  }

  @Test
  fun writeOnlyProxy_registerForStorageEvents_throwsWhenClosed() = runTest {
    assertFailsWith<IllegalStateException> {
      val proxy = mockProxy()
      proxy.close()
      proxy.registerForStorageEvents(callbackId) { }
    }
  }

  @Test
  fun writeOnlyProxy_getParticleViewUnsafe_throws() = runTest {
    assertFailsWith<UnsupportedOperationException> {
      val proxy = mockProxy()
      proxy.getParticleViewUnsafe()
    }
  }

  @Test
  fun writeOnlyProxy_onMessage_throws() = runTest {
    assertFailsWith<UnsupportedOperationException> {
      mockProxy()
      fakeStoreEndpoint.callback?.invoke(ProxyMessage.ModelUpdate(mockCrdtData, null))
    }
  }

  @Test
  fun onReadyImmediatelyCalled() = runTest {
    val proxy = mockProxy()
    val callback: () -> Unit = mock()
    proxy.addOnReady(callbackId, callback)
    scheduler.waitForIdle()
    verify(callback).invoke()
    proxy.prepareForSync()
    proxy.maybeInitiateSync()
    verifyNoMoreInteractions(callback)
  }

  @Test
  fun storageEventReadyCalledAfterMaybeInitiateSync() = runTest {
    val proxy = mockProxy()
    val callback: () -> Unit = mock()
    proxy.registerForStorageEvents(callbackId) { callback() }
    verifyZeroInteractions(callback)
    proxy.prepareForSync()
    proxy.maybeInitiateSync()
    scheduler.waitForIdle()
    verify(callback).invoke()
  }

  @Test
  fun applyOpsSucceeds() = runTest {
    val proxy = mockProxy()
    assertThat(proxy.applyOps(listOf(mockCrdtOperation, mockCrdtOperation)).await()).isTrue()
    assertThat(fakeStoreEndpoint.getProxyMessages()).containsExactly(
      ProxyMessage.Operations<CrdtData, CrdtOperation, String>(
        listOf(mockCrdtOperation, mockCrdtOperation), null
      )
    )
  }

  @Test
  fun getVersionMap() = runTest {
    val proxy = mockProxy()
    val proxyMap = proxy.getVersionMap()
    assertThat(proxyMap).isEqualTo(VersionMap())
  }

  @Test
  fun closeStorageProxy_closesStoreEndpoint() = runTest {
    val proxy = mockProxy()
    proxy.close()
    assertThat(fakeStoreEndpoint.closed).isTrue()
    assertThat(proxy.isClosed()).isTrue()
  }

  private fun runTest(block: suspend CoroutineScope.() -> Unit) = runBlocking {
    // TODO(b/161494972): remove this and fix the tests
    ArcsStrictMode.disableStrictHandles()
    withTimeout(5000) { this.block() }
  }
}
