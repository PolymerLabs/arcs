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
import arcs.android.storage.StorageServiceMessageProto
import arcs.android.storage.service.testing.FakeResultCallback
import arcs.android.storage.toProto
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.data.CountType
import arcs.core.storage.ProxyCallback
import arcs.core.storage.ProxyMessage
import arcs.core.storage.StorageKey
import arcs.core.storage.StoreOptions
import arcs.core.storage.UntypedActiveStore
import arcs.core.storage.UntypedProxyMessage
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.NoopActiveStore
import arcs.core.util.statistics.TransactionStatisticsImpl
import arcs.flags.BuildFlagDisabledError
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.eq
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.verify
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class StorageChannelImplTest {
  @get:Rule
  val buildFlagsRule = BuildFlagsRule.create()

  private lateinit var messageCallback: IMessageCallback
  private lateinit var resultCallback: FakeResultCallback

  @Before
  fun setUp() {
    BuildFlags.STORAGE_SERVICE_NG = true

    messageCallback = mock {}
    resultCallback = FakeResultCallback()
  }

  @Test
  fun requiresBuildFlag() = runBlockingTest {
    BuildFlags.STORAGE_SERVICE_NG = false

    assertFailsWith<BuildFlagDisabledError> { createChannel(this) }
  }

  @Test
  fun proxiesMessagesFromStore() = runBlockingTest {
    var proxyCallback: ProxyCallback<CrdtData, CrdtOperation, Any?>? = null
    val store = object : NoopActiveStore(StoreOptions(STORAGE_KEY, CountType())) {
      override suspend fun on(callback: ProxyCallback<CrdtData, CrdtOperation, Any?>): Int {
        proxyCallback = callback
        return 123
      }
    }

    // Create channel and check it registers a listener.
    createChannel(scope = this, store = store)
    assertThat(proxyCallback).isNotNull()

    // Check channel proxies message back.
    proxyCallback!!.invoke(DUMMY_MESSAGE)
    val proto = StorageServiceMessageProto.newBuilder()
      .setProxyMessage(DUMMY_MESSAGE.toProto())
      .build()
    verify(messageCallback).onMessage(eq(proto.toByteArray()))
  }

  @Test
  fun idle_waitsForStoreIdle() = runBlockingTest {
    val job = Job()
    val store = object : NoopActiveStore(StoreOptions(STORAGE_KEY, CountType())) {
      override suspend fun idle() {
        assertThat(resultCallback.hasBeenCalled).isFalse()
        job.complete()
      }
    }

    val channel = createChannel(scope = this, store = store)

    channel.idle(1000, resultCallback)
    job.join()

    val result = resultCallback.waitForResult()
    assertThat(result).isNull()
  }

  @Test
  fun sendMessage_forwardsToStore() = runBlockingTest {
    val proto = StorageServiceMessageProto.newBuilder()
      .setProxyMessage(DUMMY_MESSAGE.toProto())
      .build()
    val onProxyMessageCompleteJob = Job()
    val store = object : NoopActiveStore(StoreOptions(STORAGE_KEY, CountType())) {
      override suspend fun onProxyMessage(
        message: UntypedProxyMessage
      ) {
        assertThat(resultCallback.hasBeenCalled).isFalse()
        assertThat(message).isEqualTo(DUMMY_MESSAGE)
        onProxyMessageCompleteJob.complete()
      }
    }
    val channel = createChannel(scope = this, store = store)

    channel.sendMessage(proto.toByteArray(), resultCallback)
    onProxyMessageCompleteJob.join()

    val result = resultCallback.waitForResult()
    assertThat(result).isNull()
  }

  @Test
  fun sendMessage_whenChannelIsClosed_returnError() = runBlockingTest {
    val channel = createClosedChannel(scope = this)

    channel.sendMessage(ByteArray(0), resultCallback)

    val result = resultCallback.waitForResult()
    assertThat(result).contains("sendMessage failed")
  }

  @Test
  fun close_unregistersListener() = runBlockingTest {
    val job = Job()
    val store = object : NoopActiveStore(StoreOptions(STORAGE_KEY, CountType())) {
      override suspend fun on(callback: ProxyCallback<CrdtData, CrdtOperation, Any?>) = 1234

      override suspend fun off(callbackToken: Int) {
        assertThat(resultCallback.hasBeenCalled).isFalse()
        assertThat(callbackToken).isEqualTo(1234)
        job.complete()
      }
    }
    val channel = createChannel(scope = this, store = store)

    channel.close(resultCallback)
    job.join()

    val result = resultCallback.waitForResult()
    assertThat(result).isNull()
  }

  @Test
  fun close_invokesCloseCallback() = runBlockingTest {
    val deferredStorageKey = CompletableDeferred<StorageKey>()

    val channel = StorageChannelImpl.create(
      store = NoopActiveStore(StoreOptions(STORAGE_KEY, CountType())),
      scope = this,
      statisticsSink = TransactionStatisticsImpl(JvmTime),
      messageCallback = messageCallback,
      onCloseCallback = { deferredStorageKey.complete(it) },
      onProxyMessageCallback = { _, _ -> }
    )

    channel.close(resultCallback)
    val storageKey = deferredStorageKey.await()

    assertThat(storageKey).isEqualTo(STORAGE_KEY)
  }

  private suspend fun createChannel(
    scope: CoroutineScope,
    store: UntypedActiveStore = NoopActiveStore(StoreOptions(STORAGE_KEY, CountType()))
  ): StorageChannelImpl {
    return StorageChannelImpl.create(
      store = store,
      scope = scope,
      statisticsSink = TransactionStatisticsImpl(JvmTime),
      messageCallback = messageCallback,
      onCloseCallback = { _ -> },
      onProxyMessageCallback = { _, _ -> }
    )
  }

  private suspend fun createClosedChannel(scope: CoroutineScope): StorageChannelImpl {
    val channel = createChannel(scope)
    val callback = FakeResultCallback()
    channel.close(callback)
    val result = callback.waitForResult()
    assertThat(result).isNull()
    return channel
  }

  companion object {
    private val DUMMY_MESSAGE = ProxyMessage.SyncRequest<CrdtData, CrdtOperation, Any?>(0)
    private val STORAGE_KEY = RamDiskStorageKey("myCount")
  }
}
