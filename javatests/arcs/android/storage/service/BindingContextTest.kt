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

package arcs.android.storage.service

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.storage.decodeProxyMessage
import arcs.android.storage.toProto
import arcs.core.crdt.CrdtCount
import arcs.core.crdt.CrdtException
import arcs.core.data.CountType
import arcs.core.storage.ActiveStore
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import arcs.core.storage.UntypedProxyMessage
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.testDatabaseDriverFactory
import arcs.core.storage.testutil.testWriteBackProvider
import arcs.core.util.statistics.TransactionStatisticsImpl
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.whenever
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [BindingContext]. */
@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class, FlowPreview::class)
class BindingContextTest {
  @get:Rule
  val log = LogRule()

  private lateinit var bindingContextScope: CoroutineScope
  private lateinit var store: ActiveStore<CrdtCount.Data, CrdtCount.Operation, Int>
  private lateinit var storageKey: StorageKey

  @Before
  fun setUp() = runBlocking {
    bindingContextScope = CoroutineScope(Dispatchers.Default + Job())
    DriverAndKeyConfigurator.configure(null)
    RamDisk.clear()
    storageKey = RamDiskStorageKey("myCount")
    store = ActiveStore(
      StoreOptions(
        storageKey,
        CountType()
      ),
      bindingContextScope,
      testDatabaseDriverFactory,
      ::testWriteBackProvider,
      null
    )
  }

  @After
  fun tearDown() {
    bindingContextScope.cancel()
  }

  private fun buildContext(
    storeProvider: suspend () -> ActiveStore<*, *, *> = { store },
    callback: suspend (StorageKey, UntypedProxyMessage) -> Unit = { _, _ -> }
  ) = BindingContext(
    storeProvider,
    bindingContextScope,
    TransactionStatisticsImpl(),
    null,
    callback
  )

  @Test
  fun registerCallback_registersCallbackWithStore() = runBlocking {
    val bindingContext = buildContext()
    val callback = DeferredProxyCallback()

    suspendForRegistrationCallback {
      bindingContext.registerCallback(callback, it)
    }

    // Now send a message directly to the store, and see if we hear it from our callback.
    val message = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
      listOf(
        CrdtCount.Operation.Increment("alice", 0 to 1),
        CrdtCount.Operation.Increment("bob", 0 to 1)
      ),
      id = null
    )

    val messageSend = launch(Dispatchers.IO) { store.onProxyMessage(message) }

    log("waiting for message-send to finish")
    withTimeout(5000) { messageSend.join() }
    log("message-send finished")

    log("waiting for callback")
    val operations = withTimeout(5000) {
      callback.await().decodeProxyMessage() as ProxyMessage.Operations
    }
    log("callback heard")
    assertThat(operations.operations).isEqualTo(message.operations)
  }

  @Test
  fun registerCallback_errorDuringRegistration_propagatesException(): Unit = runBlocking {
    val mockStore = mock<ActiveStore<*, *, *>>()
    whenever(mockStore.on(any())).thenThrow(IllegalStateException("Intentionally throw error!"))

    val bindingContext = buildContext(storeProvider = { mockStore })
    val callback = DeferredProxyCallback()

    val e = assertFailsWith(CrdtException::class) {
      suspendForRegistrationCallback {
        bindingContext.registerCallback(callback, it)
      }
    }
    assertThat(e).hasCauseThat().hasCauseThat()
      .hasMessageThat().contains("Intentionally throw error!")
  }

  @Test
  fun unregisterCallback_unregistersCallbackFromStore() = runBlocking {
    val bindingContext = buildContext()
    val callback = DeferredProxyCallback()

    val token = suspendForRegistrationCallback {
      bindingContext.registerCallback(callback, it)
    }

    suspendForResultCallback {
      bindingContext.unregisterCallback(token, it)
    }

    // Yield to let the unregister go through.
    delay(200)

    // Now send a message directly to the store, and ensure we didn't hear of it with our
    // callback.
    val message = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
      listOf(
        CrdtCount.Operation.Increment("alice", 0 to 1),
        CrdtCount.Operation.Increment("bob", 0 to 1)
      ),
      id = null
    )
    store.onProxyMessage(message)

    assertThat(callback.isCompleted).isEqualTo(false)
  }

  @Test
  fun sendProxyMessage_causesSendToCallback() = runBlocking {
    var receivedKey: StorageKey? = null
    var receivedMessage: ProxyMessage<*, *, *>? = null
    val bindingContext = buildContext { key, message ->
      receivedKey = key
      receivedMessage = message
    }
    val message = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
      listOf(CrdtCount.Operation.MultiIncrement("alice", 0 to 10, 10)),
      id = 1
    )

    suspendForResultCallback {
      bindingContext.sendProxyMessage(message.toProto().toByteArray(), it)
    }

    // sendProxyMessage does not wait for the op to complete.
    suspendForResultCallback { resultCallback ->
      bindingContext.idle(10000, resultCallback)
    }

    assertThat(receivedKey).isEqualTo(storageKey)
    assertThat(receivedMessage).isEqualTo(message)
  }
}
