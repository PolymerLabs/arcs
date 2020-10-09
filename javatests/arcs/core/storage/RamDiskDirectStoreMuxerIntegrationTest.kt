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

import arcs.core.crdt.CrdtCount
import arcs.core.crdt.CrdtCount.Operation.Increment
import arcs.core.crdt.CrdtCount.Operation.MultiIncrement
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtOperation
import arcs.core.crdt.CrdtOperationAtTime
import arcs.core.data.CountType
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.testutil.testWriteBackProvider
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [RamDiskDriver] coupled with [DirectStoreMuxer]. */
@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class RamDiskDirectStoreMuxerIntegrationTest {

  @Before
  fun setup() {
    DefaultDriverFactory.update(RamDiskDriverProvider())
  }

  @After
  fun teardown() = runBlocking {
    RamDisk.clear()
  }

  @Suppress("UNCHECKED_CAST")
  @Test
  fun allowsStorageOf_aNumberOfObjects() = runBlockingTest {
    val message = atomic<ProxyMessage<CrdtCount.Data, CrdtCount.Operation, Int>?>(null)
    val muxId = atomic<String?>(null)
    var job = Job()

    val storageKey = RamDiskStorageKey("unique")
    val store = DirectStoreMuxerImpl<CrdtData, CrdtOperationAtTime, Any?>(
      storageKey = storageKey,
      backingType = CountType(),
      coroutineScope = this,
      writeBackProvider = ::testWriteBackProvider,
      devTools = null
    ).also {
      it.on { muxedProxyMessage ->
        message.value = muxedProxyMessage.message
          as ProxyMessage<CrdtCount.Data, CrdtCount.Operation, Int>
        muxId.value = muxedProxyMessage.muxId
        job.complete()
      }
    }

    val count1 = CrdtCount()
    count1.applyOperation(Increment("me", version = 0 to 1))

    val count2 = CrdtCount()
    count2.applyOperation(MultiIncrement("them", version = 0 to 10, delta = 15))

    store.onProxyMessage(
      MuxedProxyMessage<CrdtData, CrdtOperationAtTime, Any?>(
        "thing0",
        ProxyMessage.ModelUpdate(count1.data, null)
      )
    )
    store.onProxyMessage(
      MuxedProxyMessage<CrdtData, CrdtOperationAtTime, Any?>(
        "thing1",
        ProxyMessage.ModelUpdate(count2.data, null)
      )
    )

    store.idle()

    store.onProxyMessage(
      MuxedProxyMessage(
        "thing0",
        ProxyMessage.SyncRequest(null)
      )
    )
    job.join()
    message.value.assertHasData(count1)
    assertThat(muxId.value ?: "huh, it was null.").isEqualTo("thing0")

    message.value = null
    muxId.value = null
    job = Job()
    store.onProxyMessage(
      MuxedProxyMessage(
        "thing1",
        ProxyMessage.SyncRequest(null)
      )
    )
    job.join()
    message.value.assertHasData(count2)
    assertThat(muxId.value ?: "huh, it was null.").isEqualTo("thing1")

    message.value = null
    muxId.value = null
    job = Job()
    store.onProxyMessage(
      MuxedProxyMessage(
        "not-a-thing",
        ProxyMessage.SyncRequest(null)
      )
    )
    job.join()
    message.value.assertHasData(CrdtCount())
    assertThat(muxId.value ?: "huh, it was null.").isEqualTo("not-a-thing")
  }

  private fun <Data, Op, ConsumerData> ProxyMessage<Data, Op, ConsumerData>?.assertHasData(
    expectedModel: CrdtModel<Data, Op, ConsumerData>
  ) where Data : CrdtData, Op : CrdtOperation {
    assertWithMessage("Message must be initialized.").that(this).isNotNull()
    when (this) {
      is ProxyMessage.ModelUpdate -> assertThat(model).isEqualTo(expectedModel.data)
      else -> fail("Message $this is not a ModelUpdate")
    }
  }
}
