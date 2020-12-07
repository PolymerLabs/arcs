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
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertFailsWith

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class MuxedStorageChannelImplTest {

  @get:Rule
  val buildFlagsRule = BuildFlagsRule()

  private lateinit var messageCallback: IMessageCallback
  private lateinit var resultCallback: FakeResultCallback

  @Before
  fun setUp() {
    BuildFlags.ENTITY_HANDLE_API = true
    messageCallback = mock {}
    resultCallback = FakeResultCallback()
  }

  @Test
  fun requiresBuildFlag() = runBlockingTest {
    BuildFlags.ENTITY_HANDLE_API = false

    assertFailsWith<BuildFlagDisabledError> { createChannel(this) }
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
    val proto = StorageServiceMessageProto.newBuilder()
      .setMuxedProxyMessage(DUMMY_MESSAGE.toProto())
      .build()
    verify(messageCallback).onMessage(eq(proto.toByteArray()))
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

  private suspend fun createChannel(
    scope: CoroutineScope,
    directStoreMuxer: UntypedDirectStoreMuxer = NoopDirectStoreMuxer()
  ): MuxedStorageChannelImpl {
    return MuxedStorageChannelImpl.create(
      directStoreMuxer,
      scope,
      BindingContextStatsImpl(),
      messageCallback
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

  companion object {
    private val DUMMY_MESSAGE = MuxedProxyMessage<CrdtData, CrdtOperation, Any?>(
      "thing0",
      ProxyMessage.SyncRequest(null)
    )
  }
}
