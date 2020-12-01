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

import arcs.core.crdt.CrdtCount
import arcs.core.crdt.VersionMap
import arcs.core.storage.ProxyMessage
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ProxyMessageProtoTest {
  @Test
  fun roundTrip_syncRequest_withId() {
    val message = ProxyMessage.SyncRequest<CrdtCount.Data, CrdtCount.Operation, Int>(id = 1)

    assertThat(message.toProto().decode()).isEqualTo(message)
  }

  @Test
  fun roundTrip_syncRequest_withoutId() {
    val message = ProxyMessage.SyncRequest<CrdtCount.Data, CrdtCount.Operation, Int>(id = null)

    assertThat(message.toProto().decode()).isEqualTo(message)
  }

  @Test
  fun roundTrip_modelUpdate() {
    val message = ProxyMessage.ModelUpdate<CrdtCount.Data, CrdtCount.Operation, Int>(
      CrdtCount.Data(
        mutableMapOf("Foo" to 1, "Bar" to 2),
        VersionMap("Foo" to 1, "Bar" to 1)
      ),
      id = 1
    )

    assertThat(message.toProto().decode()).isEqualTo(message)
  }

  @Test
  fun roundTrip_operations() {
    val message = ProxyMessage.Operations<CrdtCount.Data, CrdtCount.Operation, Int>(
      listOf(
        CrdtCount.Operation.Increment(
          actor = "foo",
          version = 0 to 1
        ),
        CrdtCount.Operation.MultiIncrement(
          actor = "bar",
          version = 0 to 20,
          delta = 20
        )
      ),
      id = 1
    )

    assertThat(message.toProto().decode()).isEqualTo(message)
  }

  @Test
  fun decodeProxyMessage() {
    val message = ProxyMessage.SyncRequest<CrdtCount.Data, CrdtCount.Operation, Int>(id = 1)

    assertThat(message.toProto().toByteArray().decodeProxyMessage()).isEqualTo(message)
  }
}
