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

package arcs.android.crdt

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.crdt.CrdtException
import com.google.common.truth.Truth.assertThat
import java.lang.IllegalArgumentException
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [CrdtExceptionProto]. */
@RunWith(AndroidJUnit4::class)
class CrdtExceptionProtoTest {
  @Test
  fun roundtripNoCause() {
    val exception = CrdtException("Uh oh")
    val proto = exception.toProto()

    assertThat(proto.message).isEqualTo("Uh oh")
    // Just check the stack trace isn't empty. It's hard to know what is in it exactly.
    assertThat(proto.stackTraceList).isNotEmpty()
    assertThat(proto.causeMessage).isEmpty()

    val decoded = proto.decode()

    assertThat(decoded.toString()).isEqualTo("arcs.core.crdt.CrdtException: Uh oh")
    assertThat(decoded.cause).isNull()
  }

  @Test
  fun roundtripWithCause() {
    val exception = CrdtException("Uh oh", IllegalArgumentException("ops"))
    val proto = exception.toProto()

    assertThat(proto.message).isEqualTo("Uh oh")
    // Just check the stack trace isn't empty. It's hard to know what is in it exactly.
    assertThat(proto.stackTraceList).isNotEmpty()
    assertThat(proto.causeMessage).isEqualTo("java.lang.IllegalArgumentException: ops")

    val decoded = proto.decode()

    assertThat(decoded.toString()).isEqualTo("arcs.core.crdt.CrdtException: Uh oh")
    // The cause gets wrapped in a new throwable. Its stack trace is unfortunately lost.
    assertThat(decoded.cause.toString())
      .isEqualTo("java.lang.Throwable: java.lang.IllegalArgumentException: ops")
  }
}
