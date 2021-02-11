package arcs.android.crdt

import android.os.Parcel
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import com.google.common.truth.Truth.assertThat

/**
 * When we write [CrdtData] into Parcelables using [writeModelData], we can always reconstruct
 * the identical model by reading using [readModelData]
 */
fun invariant_CrdtData_preservedDuring_parcelRoundTrip(data: CrdtData) {
  val unmarshalled = roundTripThroughParcel(data, Parcel::writeModelData, Parcel::readModelData)
  assertThat(unmarshalled).isEqualTo(data)
}

/**
 * When we write a [CrdtOperation] into a Parcelable using [writeOperation], we can always
 * reconstruct the identical operation by reading using [readOperation]
 */
fun invariant_CrdtOperation_preservedDuring_parcelRoundTrip(op: CrdtOperation) {
  val unmarshalled = roundTripThroughParcel(op, Parcel::writeOperation, Parcel::readOperation)
  assertThat(unmarshalled).isEqualTo(op)
}
