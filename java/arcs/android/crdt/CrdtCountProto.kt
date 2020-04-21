package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.crdt.CrdtCount

/** Constructs a [CrdtCount.Data] from the given [CrdtCountProto.Data]. */
fun CrdtCountProto.Data.toData() = CrdtCount.Data(
    versionMap = fromProto(versionMap),
    values = valuesMap.toMutableMap()
)

/** Constructs a [CrdtCount.Operation] from the given [CrdtCountProto.Operation]. */
fun CrdtCountProto.Operation.toOperation(): CrdtCount.Operation = when (operationCase) {
    CrdtCountProto.Operation.OperationCase.INCREMENT -> with(increment) {
        CrdtCount.Operation.Increment(
            actor = actor,
            version = fromVersion to toVersion
        )
    }
    CrdtCountProto.Operation.OperationCase.MULTI_INCREMENT -> with(multiIncrement) {
        CrdtCount.Operation.MultiIncrement(
            actor = actor,
            version = fromVersion to toVersion,
            delta = delta
        )
    }
    CrdtCountProto.Operation.OperationCase.OPERATION_NOT_SET, null ->
        throw UnsupportedOperationException("Unknown CrdtCount.Operation type: $operationCase.")
}

/** Serializes a [CrdtCount.Data] to its proto form. */
fun CrdtCount.Data.toProto() = CrdtCountProto.Data.newBuilder()
    .setVersionMap(versionMap.toProto())
    .putAllValues(values)
    .build()

/** Serializes a [CrdtCount.Operation] to its proto form. */
fun CrdtCount.Operation.toProto(): CrdtCountProto.Operation {
    val proto = CrdtCountProto.Operation.newBuilder()
    when (this) {
        is CrdtCount.Operation.Increment -> {
            proto.increment = CrdtCountProto.Operation.Increment.newBuilder()
                .setActor(actor)
                .setFromVersion(version.first)
                .setToVersion(version.second)
                .build()
        }
        is CrdtCount.Operation.MultiIncrement -> {
            proto.multiIncrement = CrdtCountProto.Operation.MultiIncrement.newBuilder()
                .setActor(actor)
                .setFromVersion(version.first)
                .setToVersion(version.second)
                .setDelta(delta)
                .build()
        }
        else -> throw UnsupportedOperationException("Unsupported CrdtCount.Operation: $this.")
    }
    return proto.build()
}

/** Reads a [CrdtCount.Data] out of a [Parcel]. */
fun Parcel.readCrdtCountData(): CrdtCount.Data? =
    readProto(CrdtCountProto.Data.getDefaultInstance())?.toData()

/** Reads a [CrdtCount.Operation] out of a [Parcel]. */
fun Parcel.readCrdtCountOperation(): CrdtCount.Operation? =
    readProto(CrdtCountProto.Operation.getDefaultInstance())?.toOperation()
