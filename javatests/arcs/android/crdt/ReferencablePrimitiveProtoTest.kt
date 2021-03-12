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

package arcs.android.crdt

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.data.util.toReferencable
import arcs.core.util.ArcsDuration
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReferencablePrimitiveProtoTest {
  @Test
  fun parcelableRoundTrip_works_forBytes() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(42.toByte().toReferencable())
  }

  @Test
  fun parcelableRoundTrip_works_forChars() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip('a'.toReferencable())
  }

  @Test
  fun parcelableRoundTrip_works_forNewlineChars() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip('\n'.toReferencable())
  }

  @Test
  fun parcelableRoundTrip_works_forCarriageReturnChars() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip('\r'.toReferencable())
  }

  @Test
  fun parcelableRoundTrip_works_forShorts() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(
      1337.toShort().toReferencable()
    )
  }

  @Test
  fun parcelableRoundTrip_works_forInts() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(1.toReferencable())
  }

  @Test
  fun parcelableRoundTrip_works_forLongs() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(6000000000L.toReferencable())
  }

  @Test
  fun parcelableRoundTrip_works_forFloats() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(1.0f.toReferencable())
  }

  @Test
  fun parcelableRoundTrip_works_forDoubles() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(1.0.toReferencable())
  }

  @Test
  fun parcelableRoundTrip_works_forStrings() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(
      "This is a test".toReferencable()
    )
  }

  @Test
  fun parcelableRoundTrip_works_forStrings_withParenthesis() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(
      "This) ((is) a((()())( test(".toReferencable()
    )
  }

  @Test
  fun parcelableRoundTrip_works_forBooleans() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(true.toReferencable())
  }

  @Test
  fun parcelableRoundTrip_works_forByteArrays() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(
      ByteArray(10) { it.toByte() }.toReferencable()
    )
  }

  @Test
  fun parcelableRoundTrip_works_forBigInts() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(
      BigInt("100000000000000000000000000000000000000000001").toReferencable()
    )
  }

  @Test
  fun parcelableRoundTrip_works_forArcsDurations() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(
      ArcsDuration.ofMillis(1337).toReferencable()
    )
  }

  @Test
  fun parcelableRoundTrip_works_forArcsInstants() {
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(
      ArcsInstant.ofEpochMilli(1337).toReferencable()
    )
  }
}
