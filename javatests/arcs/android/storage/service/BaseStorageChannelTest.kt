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
import arcs.android.storage.service.testing.FakeResultCallback
import arcs.android.storage.service.testing.NoopStorageChannel
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class BaseStorageChannelTest {

  private lateinit var resultCallback: FakeResultCallback

  @Before
  fun setUp() {
    resultCallback = FakeResultCallback()
  }

  @Test
  fun idle_waitsForStoreIdle() = runBlockingTest {
    val job = Job()
    val channel = object : NoopStorageChannel(this) {
      override suspend fun idleStore() {
        assertThat(resultCallback.hasBeenCalled).isFalse()
        job.complete()
      }
    }

    channel.idle(1000, resultCallback)
    job.join()

    val result = resultCallback.waitForResult()
    assertThat(result).isNull()
  }

  @Test
  fun idle_propagatesExceptions() = runBlockingTest {
    val channel = object : NoopStorageChannel(this) {
      override suspend fun idleStore() {
        assertThat(resultCallback.hasBeenCalled).isFalse()
        throw InternalError()
      }
    }

    channel.idle(1000, resultCallback)

    val result = resultCallback.waitForResult()
    assertThat(result).contains("idle failed")
  }

  @Test
  fun idle_whenChannelIsClosed_returnsError() = runBlockingTest {
    val channel = createClosedChannel(this)

    channel.idle(1000, resultCallback)

    val result = resultCallback.waitForResult()
    assertThat(result).contains("idle failed")
  }

  @Test
  fun close_unregistersListener() = runBlockingTest {
    val job = Job()
    val channel = object : NoopStorageChannel(this) {
      override suspend fun unregisterFromStore(token: Int) {
        assertThat(resultCallback.hasBeenCalled).isFalse()
        job.complete()
      }
    }

    channel.close(resultCallback)
    job.join()

    val result = resultCallback.waitForResult()
    assertThat(result).isNull()
  }

  @Test
  fun close_whenChannelIsClosed_returnsError() = runBlockingTest {
    val channel = createClosedChannel(this)

    // Attempt to close the channel again
    channel.close(resultCallback)
    val secondChannelClosingResult = resultCallback.waitForResult()
    assertThat(secondChannelClosingResult).contains("close failed")
  }

  private suspend fun createClosedChannel(scope: CoroutineScope): NoopStorageChannel {
    val channel = NoopStorageChannel(scope)
    val callback = FakeResultCallback()
    channel.close(callback)
    val result = callback.waitForResult()
    assertThat(result).isNull()
    return channel
  }
}
