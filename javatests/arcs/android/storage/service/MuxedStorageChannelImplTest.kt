package arcs.android.storage.service

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.storage.StorageServiceMessageProto
import arcs.android.storage.service.testing.FakeResultCallback
import arcs.android.storage.toProto
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.MuxedProxyCallback
import arcs.core.storage.MuxedProxyMessage
import arcs.core.storage.ProxyMessage
import arcs.core.storage.UntypedDirectStoreMuxer
import arcs.core.storage.testutil.NoopDirectStoreMuxer
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class MuxedStorageChannelImplTest {
  private val DUMMY_MESSAGE = MuxedProxyMessage<CrdtData, CrdtOperation, Any?>(
    "thing0",
    ProxyMessage.SyncRequest(null)
  )

  private lateinit var storageChannelCallback: IStorageChannelCallback
  private lateinit var resultCallback: FakeResultCallback

  @Before
  fun setUp() {
    storageChannelCallback = mock {}
    resultCallback = FakeResultCallback()
  }

  @Test
  fun proxiesMessagesFromDirectStoreMuxer() = runBlockingTest {
    var muxedProxyCallback: MuxedProxyCallback<CrdtData, CrdtOperation, Any?>? = null
    val directStoreMuxer = object : NoopDirectStoreMuxer() {
      override suspend fun on(callback: MuxedProxyCallback<CrdtData, CrdtOperation, Any?>): Int {
        muxedProxyCallback = callback
        return 123
      }
    }

    // Create channel and check it registers a listener.
    createChannel(scope = this, directStoreMuxer = directStoreMuxer)
    assertThat(muxedProxyCallback).isNotNull()

    // Check channel proxies messages back.
    muxedProxyCallback!!.invoke(DUMMY_MESSAGE)
    verify(storageChannelCallback).onMessage(eq(DUMMY_MESSAGE.toProto().toByteArray()))
  }

  @Test
  fun idle_waitsForDirectStoreMuxerIdle() = runBlockingTest {
    val job = Job()
    val directStoreMuxer = object : NoopDirectStoreMuxer() {
      override suspend fun idle() {
        assertThat(resultCallback.hasBeenCalled).isFalse()
        job.complete()
      }
    }
    val channel = createChannel(scope = this, directStoreMuxer = directStoreMuxer)

    channel.idle(1000, resultCallback)
    job.join()

    val result = resultCallback.waitForResult()
    assertThat(result).isNull()
  }

  @Test
  fun idle_propagatesExceptions() = runBlockingTest {
    val directStoreMuxer = object : NoopDirectStoreMuxer() {
      override suspend fun idle() {
        assertThat(resultCallback.hasBeenCalled).isFalse()
        throw InternalError()
      }
    }
    val channel = createChannel(scope = this, directStoreMuxer = directStoreMuxer)

    channel.idle(1000, resultCallback)

    val result = resultCallback.waitForResult()
    assertThat(result).contains("idle failed")
  }

  @Test
  fun idle_whenChannelIsClosed_returnsError() = runBlockingTest {
    val channel = createClosedChannel(scope = this)

    channel.idle(1000, resultCallback)

    val result = resultCallback.waitForResult()
    assertThat(result).contains("idle failed")
  }

  @Test
  fun sendMessage_forwardsToDirectStoreMuxer() = runBlockingTest {
    val proto = StorageServiceMessageProto.newBuilder()
      .setMuxedProxyMessage(DUMMY_MESSAGE.toProto())
      .build()
    val onProxyMessageCompleteJob = Job()
    val directStoreMuxer = object : NoopDirectStoreMuxer() {
      override suspend fun onProxyMessage(
        muxedMessage: MuxedProxyMessage<CrdtData, CrdtOperation, Any?>
      ) {
        assertThat(resultCallback.hasBeenCalled).isFalse()
        assertThat(muxedMessage).isEqualTo(DUMMY_MESSAGE)
        onProxyMessageCompleteJob.complete()
      }
    }
    val channel = createChannel(scope = this, directStoreMuxer = directStoreMuxer)

    channel.sendMessage(proto.toByteArray(), resultCallback)
    onProxyMessageCompleteJob.join()

    val result = resultCallback.waitForResult()
    assertThat(result).isNull()
  }

  @Test
  fun sendMessage_whenChannelIsClosed_returnsError() = runBlockingTest {
    val channel = createClosedChannel(scope = this)

    channel.sendMessage(ByteArray(0), resultCallback)

    val result = resultCallback.waitForResult()
    assertThat(result).contains("sendMessage failed")
  }

  @Test
  fun close_unregistersListener() = runBlockingTest {
    val job = Job()
    val directStoreMuxer = object : NoopDirectStoreMuxer() {
      override suspend fun on(callback: MuxedProxyCallback<CrdtData, CrdtOperation, Any?>) = 1234

      override suspend fun off(token: Int) {
        assertThat(resultCallback.hasBeenCalled).isFalse()
        assertThat(token).isEqualTo(1234)
        job.complete()
      }
    }
    val channel = createChannel(scope = this, directStoreMuxer = directStoreMuxer)

    channel.close(resultCallback)
    job.join()

    val result = resultCallback.waitForResult()
    assertThat(result).isNull()
  }

  @Test
  fun close_whenChannelIsClosed_returnsError() = runBlockingTest {
    val channel = createClosedChannel(scope = this)

    channel.close(resultCallback)

    val result = resultCallback.waitForResult()
    assertThat(result).contains("close failed")
  }

  private suspend fun createChannel(
    scope: CoroutineScope,
    directStoreMuxer: UntypedDirectStoreMuxer = NoopDirectStoreMuxer()
  ): MuxedStorageChannelImpl {
    return MuxedStorageChannelImpl.create(
      directStoreMuxer,
      scope,
      BindingContextStatsImpl(),
      storageChannelCallback
    )
  }

  /** Creates a new channel and immediately closes it. */
  private suspend fun createClosedChannel(scope: CoroutineScope): MuxedStorageChannelImpl {
    val channel = createChannel(scope)
    val callback = FakeResultCallback()
    channel.close(callback)
    val result = callback.waitForResult()
    assertThat(result).isNull()
    return channel
  }
}
