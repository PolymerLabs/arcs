package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.writeProto
import arcs.core.crdt.CrdtData
import arcs.core.crdt.CrdtOperation
import arcs.core.data.util.ReferencablePrimitive
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

/**
 * When we write a [CrdtOperation] list into a Parcelable using [writeOperations], we can always
 * reconstruct the identical operations by reading using [readOperations]
 */
fun invariant_CrdtOperations_preservedDuring_parcelRoundTrip(ops: List<CrdtOperation>) {
  val unmarshalled = roundTripThroughParcel(ops, Parcel::writeOperations, Parcel::readOperations)
  assertThat(unmarshalled).isEqualTo(ops)
}

private fun <T> Parcel.writeReferencablePrimitiveAsProto(primitive: ReferencablePrimitive<T>) {
  writeProto(primitive.toProto())
}

/**
 * When we write a [ReferencablePrimitive] into a Parcelable using [writeProto], we can always
 * reconstruct the identical primitive by reading using [readReferencablePrimitive]
 */
fun <T> invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(
  primitive: ReferencablePrimitive<T>
) {
  val unmarshalled = roundTripThroughParcel(
    primitive,
    Parcel::writeReferencablePrimitiveAsProto,
    Parcel::readReferencablePrimitive
  )
  assertThat(unmarshalled).isEqualTo(primitive)
}
