package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSingleton

/** Constructs a [CrdtSingleton.Data] from the given [CrdtSingletonProto.Data]. */
fun CrdtSingletonProto.Data.toData() = CrdtSingleton.DataImpl<Referencable>(
    versionMap = fromProto(versionMap),
    values = valuesMap.mapValuesTo(mutableMapOf()) { it.value.toDataValue() }
)

/** Constructs a [CrdtSingleton.Operation] from the given [CrdtSingletonProto.Operation]. */
fun CrdtSingletonProto.Operation.toOperation(): CrdtSingleton.Operation<Referencable> =
    when (operationCase) {
        CrdtSingletonProto.Operation.OperationCase.UPDATE -> with(update) {
            CrdtSingleton.Operation.Update<Referencable>(
                actor = actor,
                clock = fromProto(versionMap),
                value = value.toReferencable()!!
            )
        }
        CrdtSingletonProto.Operation.OperationCase.CLEAR -> with(clear) {
            CrdtSingleton.Operation.Clear<Referencable>(
                actor = actor,
                clock = fromProto(versionMap)
            )
        }
        CrdtSingletonProto.Operation.OperationCase.OPERATION_NOT_SET, null ->
            throw UnsupportedOperationException(
                "Unknown CrdtSingleton.Operation type: $operationCase."
            )
    }

/** Serializes a [CrdtSingleton.Data] to its proto form. */
fun CrdtSingleton.Data<*>.toProto() = CrdtSingletonProto.Data.newBuilder()
    .setVersionMap(versionMap.toProto())
    .putAllValues(values.mapValues { it.value.toProto() })
    .build()

/** Serializes a [CrdtSingleton.Operation] to its proto form. */
fun CrdtSingleton.Operation<*>.toProto(): CrdtSingletonProto.Operation {
    val proto = CrdtSingletonProto.Operation.newBuilder()
    when (this) {
        is CrdtSingleton.Operation.Update<*> -> proto.update = toProto()
        is CrdtSingleton.Operation.Clear<*> -> proto.clear = toProto()
        else -> throw UnsupportedOperationException("Unsupported CrdtSingleton.Operation: $this.")
    }
    return proto.build()
}

/** Serializes a [CrdtSingleton.Operation.Update] to its proto form. */
private fun CrdtSingleton.Operation.Update<*>.toProto() =
    CrdtSingletonProto.Operation.Update.newBuilder()
        .setVersionMap(clock.toProto())
        .setActor(actor)
        .setValue(value.toProto())
        .build()

/** Serializes a [CrdtSingleton.Operation.Clear] to its proto form. */
private fun CrdtSingleton.Operation.Clear<*>.toProto() =
    CrdtSingletonProto.Operation.Clear.newBuilder()
        .setVersionMap(clock.toProto())
        .setActor(actor)
        .build()

/** Reads a [CrdtSingleton.Data] out of a [Parcel]. */
fun Parcel.readCrdtSingletonData(): CrdtSingleton.Data<Referencable>? =
    readProto(CrdtSingletonProto.Data.getDefaultInstance())?.toData()

/** Reads a [CrdtSingleton.Operation] out of a [Parcel]. */
fun Parcel.readCrdtSingletonOperation(): CrdtSingleton.Operation<Referencable>? =
    readProto(CrdtSingletonProto.Operation.getDefaultInstance())?.toOperation()
