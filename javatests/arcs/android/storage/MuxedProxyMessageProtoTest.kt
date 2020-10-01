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

package arcs.android.storage

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.crdt.CrdtCount
import arcs.core.storage.MuxedProxyMessage
import arcs.core.storage.ProxyMessage
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MuxedProxyMessageProtoTest {
  @Test
  fun roundTrip() {
    val muxedProxyMessage = MuxedProxyMessage<CrdtCount.Data, CrdtCount.Operation, Int>(
      muxId = "abc123",
      message = ProxyMessage.SyncRequest(id = 1)
    )

    assertThat(muxedProxyMessage.toProto().decode()).isEqualTo(muxedProxyMessage)
  }
}
