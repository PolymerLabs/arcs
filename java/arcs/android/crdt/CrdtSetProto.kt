package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSet

/** Constructs a [CrdtSet.DataValue] from the given [CrdtSetProto.DataValue]. */
fun CrdtSetProto.DataValue.toDataValue() = CrdtSet.DataValue(
    versionMap = fromProto(versionMap),
    value = value.toReferencable()!!
)

/** Constructs a [CrdtSet.Data] from the given [CrdtSetProto.Data]. */
fun CrdtSetProto.Data.toData() = CrdtSet.DataImpl<Referencable>(
    versionMap = fromProto(versionMap),
    values = valuesMap.mapValuesTo(mutableMapOf()) { it.value.toDataValue() }
)

/** Constructs a [CrdtSet.Operation] from the given [CrdtSetProto.Operation]. */
fun CrdtSetProto.Operation.toOperation(): CrdtSet.Operation<Referencable> = when (operationCase) {
    CrdtSetProto.Operation.OperationCase.ADD -> with(add) {
        CrdtSet.Operation.Add(
            actor = actor,
            clock = fromProto(versionMap),
            added = added.toReferencable()!!
        )
    }
    CrdtSetProto.Operation.OperationCase.REMOVE -> with(remove) {
        CrdtSet.Operation.Remove(
            actor = actor,
            clock = fromProto(versionMap),
            removed = removed.toReferencable()!!
        )
    }
    CrdtSetProto.Operation.OperationCase.CLEAR -> with(clear) {
        CrdtSet.Operation.Clear<Referencable>(
            actor = actor,
            clock = fromProto(versionMap)
        )
    }
    CrdtSetProto.Operation.OperationCase.FAST_FORWARD -> with(fastForward) {
        CrdtSet.Operation.FastForward<Referencable>(
            oldClock = fromProto(oldVersionMap),
            newClock = fromProto(newVersionMap),
            added = addedList.mapTo(mutableListOf()) { it.toDataValue() },
            removed = removedList.mapTo(mutableListOf()) { it.toReferencable()!! }
        )
    }
    CrdtSetProto.Operation.OperationCase.OPERATION_NOT_SET, null ->
        throw UnsupportedOperationException("Unknown CrdtSet.Operation type: $operationCase.")
}

/** Serializes a [CrdtSet.DataValue] to its proto form. */
fun CrdtSet.DataValue<*>.toProto() = CrdtSetProto.DataValue.newBuilder()
    .setVersionMap(versionMap.toProto())
    .setValue(value.toProto())
    .build()

/** Serializes a [CrdtSet.Data] to its proto form. */
fun CrdtSet.Data<*>.toProto() = CrdtSetProto.Data.newBuilder()
    .setVersionMap(versionMap.toProto())
    .putAllValues(values.mapValues { it.value.toProto() })
    .build()

/** Serializes a [CrdtSet.Operation] to its proto form. */
fun CrdtSet.Operation<*>.toProto(): CrdtSetProto.Operation {
    val proto = CrdtSetProto.Operation.newBuilder()
    when (this) {
        is CrdtSet.Operation.Add<*> -> proto.add = toProto()
        is CrdtSet.Operation.Remove<*> -> proto.remove = toProto()
        is CrdtSet.Operation.Clear<*> -> proto.clear = toProto()
        is CrdtSet.Operation.FastForward<*> -> proto.fastForward = toProto()
    }
    return proto.build()
}

/** Serializes a [CrdtSet.Operation.Add] to its proto form. */
private fun CrdtSet.Operation.Add<*>.toProto() = CrdtSetProto.Operation.Add.newBuilder()
    .setVersionMap(clock.toProto())
    .setActor(actor)
    .setAdded(added.toProto())
    .build()

/** Serializes a [CrdtSet.Operation.Remove] to its proto form. */
private fun CrdtSet.Operation.Remove<*>.toProto() = CrdtSetProto.Operation.Remove.newBuilder()
    .setVersionMap(clock.toProto())
    .setActor(actor)
    .setRemoved(removed.toProto())
    .build()

/** Serializes a [CrdtSet.Operation.Clear] to its proto form. */
private fun CrdtSet.Operation.Clear<*>.toProto() = CrdtSetProto.Operation.Clear.newBuilder()
    .setVersionMap(clock.toProto())
    .setActor(actor)
    .build()

/** Serializes a [CrdtSet.Operation.FastForward] to its proto form. */
private fun CrdtSet.Operation.FastForward<*>.toProto() =
    CrdtSetProto.Operation.FastForward.newBuilder()
        .setOldVersionMap(oldClock.toProto())
        .setNewVersionMap(newClock.toProto())
        .addAllAdded(added.map { it.toProto() })
        .addAllRemoved(removed.map { it.toProto() })
        .build()

/** Reads a [CrdtSet.DataValue] out of a [Parcel]. */
fun Parcel.readCrdtSetDataValue(): CrdtSet.DataValue<Referencable>? =
    readProto(CrdtSetProto.DataValue.getDefaultInstance())?.toDataValue()

/** Reads a [CrdtSet.Data] out of a [Parcel]. */
fun Parcel.readCrdtSetData(): CrdtSet.Data<Referencable>? =
    readProto(CrdtSetProto.Data.getDefaultInstance())?.toData()

/** Reads a [CrdtSet.Operation] out of a [Parcel]. */
fun Parcel.readCrdtSetOperation(): CrdtSet.Operation<Referencable>? =
    readProto(CrdtSetProto.Operation.getDefaultInstance())?.toOperation()
