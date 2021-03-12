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
import arcs.core.type.Type
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import java.util.concurrent.Executors
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.MockitoAnnotations

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(JUnit4::class)
class StorageProxyImplBaseTest {
  @get:Rule
  val log = LogRule()

  private val fakeStoreEndpoint = StoreEndpointFake<CrdtData, CrdtOperation, String>()
  private val fakeStorageEndpointManager = FakeStorageEndpointManager(fakeStoreEndpoint)

  @Mock
  private lateinit var mockStorageKey: StorageKey

  @Mock
  private lateinit var mockType: Type

  private lateinit var scheduler: Scheduler

  @Before
  fun setup() {
    scheduler = Scheduler(Executors.newSingleThreadExecutor().asCoroutineDispatcher() + Job())
    MockitoAnnotations.initMocks(this)
  }

  @After
  fun tearDown() = runBlocking {
    scheduler.waitForIdle()
    scheduler.cancel()
  }

  class TestStorageProxyImplBase(
    scheduler: Scheduler
  ) : StorageProxyImplBase<CrdtData, CrdtOperation, String>(scheduler) {
    var closeCalled = false
    override fun closeInternal() {
      closeCalled = true
    }

    override fun isClosed(): Boolean = closeCalled

    companion object {
      suspend fun create(
        storeOptions: StoreOptions,
        storageEndpointManager: StorageEndpointManager,
        scheduler: Scheduler
      ): TestStorageProxyImplBase {
        /**
         * Since [storageEndpointManager.get] is a suspending method, we need to be in a
         * suspending context in order to attach its callback.
         */
        return TestStorageProxyImplBase(scheduler).also {
          it.store = storageEndpointManager.get(storeOptions, { })
        }
      }
    }
  }

  private suspend fun testProxy() = TestStorageProxyImplBase.create(
    StoreOptions(
      storageKey = mockStorageKey,
      type = mockType
    ),
    fakeStorageEndpointManager,
    scheduler
  )

  @Test
  fun storageProxy_initialized_isIdle() = runBlocking {
    assertThat(testProxy().isIdle()).isTrue()
  }

  @Test
  fun storageProxy_close_invokesCloseInternalAndClosesStore() = runBlocking {
    val proxy = testProxy()
    proxy.close()
    assertThat(proxy.isClosed()).isTrue()
    assertThat(fakeStoreEndpoint.closed).isTrue()
  }

  @Test
  fun storageProxy_sendMessage_isNotIdle() = runBlocking {
    val proxy = testProxy()
    fakeStoreEndpoint.onNextProxyMessage {
      assertThat(proxy.isIdle()).isFalse()
    }
    proxy.sendMessageToStore(ProxyMessage.SyncRequest(null))
    proxy.waitForIdle()
    assertThat(proxy.isIdle()).isTrue()
  }

  @Test
  fun storageProxy_withStoreTimeout_stillResolvesToIdle() = runBlocking {
    val proxy = testProxy()
    val deferred = CompletableDeferred<Boolean>()

    fakeStoreEndpoint.onNextProxyMessage {
      delay(5100) // outgoing message queue has 5 second timeout
    }
    proxy.sendMessageToStore(ProxyMessage.SyncRequest(null), deferred)
    proxy.waitForIdle()
    assertThat(proxy.isIdle()).isTrue()
    assertThat(deferred.await()).isTrue()
  }
}
