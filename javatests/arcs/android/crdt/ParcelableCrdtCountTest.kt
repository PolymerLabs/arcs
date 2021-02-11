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
import arcs.core.crdt.CrdtCount
import arcs.core.crdt.VersionMap
import org.junit.Test
import org.junit.runner.RunWith

/** Tests for [ParcelableCrdtCount]'s classes. */
@RunWith(AndroidJUnit4::class)
class ParcelableCrdtCountTest {
  @Test
  fun data_parcelableRoundTrip_works() {
    val data = CrdtCount.Data(
      mutableMapOf(
        "alice" to 1,
        "bob" to 2
      ),
      VersionMap("alice" to 1, "bob" to 2)
    )

    invariant_CrdtData_preservedDuring_parcelRoundTrip(data)
  }

  @Test
  fun incrementOperation_parcelableRoundTrip_works() {
    val op = CrdtCount.Operation.Increment("alice", 0 to 1)
    invariant_CrdtOperation_preservedDuring_parcelRoundTrip(op)
  }

  @Test
  fun multiIncrementOperation_parcelableRoundTrip_works() {
    val op = CrdtCount.Operation.MultiIncrement("alice", 0 to 1000, delta = 1000)
    invariant_CrdtOperation_preservedDuring_parcelRoundTrip(op)
  }

  @Test
  fun multipleOperations_crdtCount_parcelableRoundTrip_works() {
    val ops = listOf(
      CrdtCount.Operation.Increment("alice", 0 to 1),
      CrdtCount.Operation.Increment("bob", 0 to 1),
      CrdtCount.Operation.Increment("alice", 1 to 2),
      CrdtCount.Operation.MultiIncrement("bob", 1 to 50, delta = 49)
    )
    invariant_CrdtOperations_preservedDuring_parcelRoundTrip(ops)
  }
}
