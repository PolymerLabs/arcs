package arcs.sdk.android.storage

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.crdt.toProto
import arcs.android.storage.service.IResultCallback
import arcs.android.storage.service.IStorageService
import arcs.android.storage.toProto
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtException
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.ProxyMessage
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.whenever
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.stubbing.OngoingStubbing

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class AndroidStorageServiceEndpointTest {
  private val mockService = mock<IStorageService>()

  @Test
  fun onProxyMessage_forwardsToService() = runBlockingTest {
    val endpoint = endpointForTest()
    whenever(mockService.sendProxyMessage(any(), any())).completeResultCallback()

    endpoint.onProxyMessage(DUMMY_PROXY_MESSAGE)

    val expectedProtoMessage = DUMMY_PROXY_MESSAGE.withId(CHANNEL_ID).toProto().toByteArray()
    verify(mockService).sendProxyMessage(eq(expectedProtoMessage), any())
  }

  @Test
  fun onProxyMessage_propagatesException() = runBlockingTest {
    val endpoint = endpointForTest()
    whenever(mockService.sendProxyMessage(any(), any())).then {
      throw TestException()
    }

    assertFailsWith<TestException> {
      endpoint.onProxyMessage(DUMMY_PROXY_MESSAGE)
    }
  }

  @Test
  fun idle_awaitsOutgoingMessageCompletion() = runBlockingTest {
    idleTestWithMessageResult(null, this)
  }

  @Test
  fun idle_returnsOnMessageException() = runBlockingTest {
    idleTestWithMessageResult(DUMMY_CRDT_EXCEPTION_BYTES, this)
  }

  @Test
  fun idle_propagatesException() = runBlockingTest {
    val endpoint = endpointForTest()
    whenever(mockService.idle(any(), any())).completeResultCallback(DUMMY_CRDT_EXCEPTION_BYTES)

    assertFailsWith<CrdtException> {
      endpoint.idle()
    }
  }

  @Test
  fun close_unregistersCallback() = runBlockingTest {
    val endpoint = endpointForTest()
    whenever(mockService.unregisterCallback(eq(CHANNEL_ID), any())).completeResultCallback()

    endpoint.close()

    verify(mockService).unregisterCallback(eq(CHANNEL_ID), any())
  }

  @Test
  fun close_callsProvidedOnClose() = runBlockingTest {
    var onCloseCalled = false
    val endpoint = endpointForTest(
      onClose = {
        onCloseCalled = true
      }
    )
    whenever(mockService.unregisterCallback(eq(CHANNEL_ID), any())).completeResultCallback()

    endpoint.close()

    assertThat(onCloseCalled).isTrue()
  }

  @Test
  fun close_propagatesUnregisterException() = runBlockingTest {
    val endpoint = endpointForTest()
    whenever(mockService.unregisterCallback(any(), any()))
      .completeResultCallback(DUMMY_CRDT_EXCEPTION_BYTES)

    assertFailsWith<CrdtException> {
      endpoint.close()
    }
  }

  // This is a parameterized test method, used by:
  // idle_awaitsOutgoingMessageCompletion
  // idle_returnsOnMessageException
  private suspend fun idleTestWithMessageResult(result: ByteArray?, scope: CoroutineScope) {
    val endpoint = endpointForTest()
    val capturedResultCallback =
      whenever(mockService.sendProxyMessage(any(), any())).captureResultCallbackAsync()
    val capturedIdleResultCallback =
      whenever(mockService.idle(any(), any())).captureResultCallbackAsync()

    // Send a message; it won't be completed until we complete the capturedResultCallback.
    val messageJob = scope.launch {
      endpoint.onProxyMessage(DUMMY_PROXY_MESSAGE)
    }
    // Launch an idle job.
    val idleJob = scope.launch {
      endpoint.idle()
    }

    // We should not have an idle callback yet; outgoing messages were in flight.
    assertThat(capturedIdleResultCallback.isCompleted).isFalse()
    // Complete the outgoing message
    capturedResultCallback.getCompleted().onResult(result)
    // The message job will be completed now.
    messageJob.join()
    // Now we expect to have an idle result, and we'll complete it now
    capturedIdleResultCallback.getCompleted().onResult(null)
    // We expect the idle job to complete now.
    idleJob.join()
  }

  private fun endpointForTest(
    onClose: () -> Unit = {}
  ): AndroidStorageEndpoint<CrdtData, CrdtOperation, String> {
    return AndroidStorageEndpoint(
      CHANNEL_ID,
      mockService,
      onClose
    )
  }

  private fun OngoingStubbing<*>.completeResultCallback(bytes: ByteArray? = null) {
    then {
      (it.arguments[1] as IResultCallback).onResult(bytes)
    }
  }

  private fun OngoingStubbing<*>.captureResultCallbackAsync(): Deferred<IResultCallback> {
    val deferred = CompletableDeferred<IResultCallback>()
    then {
      deferred.complete(it.arguments[1] as IResultCallback)
    }
    return deferred
  }

  class TestException : Exception("test")

  companion object {
    private const val CHANNEL_ID = 78

    private val DUMMY_CRDT_EXCEPTION_BYTES = CrdtException("test").toProto().toByteArray()

    private val DUMMY_PROXY_MESSAGE =
      ProxyMessage.SyncRequest<CrdtData, CrdtOperation, String>(null)
  }
}
