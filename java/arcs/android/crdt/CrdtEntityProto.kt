package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSingleton

/** Constructs a [CrdtEntity.Data] from the given [CrdtEntityProto.Data]. */
@Suppress("UNCHECKED_CAST")
fun CrdtEntityProto.Data.toData() = CrdtEntity.Data(
    versionMap = fromProto(versionMap),
    singletons = singletonMap.mapValues {
        CrdtSingleton.createWithData(it.value.toData()) as CrdtSingleton<CrdtEntity.Reference>
    },
    collections = collectionMap.mapValues {
        CrdtSet.createWithData(it.value.toData()) as CrdtSet<CrdtEntity.Reference>
    },
    creationTimestamp = creationTimestampMs,
    expirationTimestamp = expirationTimestampMs,
    id = id
)

/** Constructs a [CrdtEntity.Operation] from the given [CrdtEntityProto.Operation]. */
fun CrdtEntityProto.Operation.toOperation(): CrdtEntity.Operation =
    when (operationCase) {
        CrdtEntityProto.Operation.OperationCase.SET_SINGLETON -> with(setSingleton) {
            CrdtEntity.Operation.SetSingleton(
                actor = actor,
                clock = fromProto(versionMap),
                field = field,
                value = value.toCrdtEntityReference()
            )
        }
        CrdtEntityProto.Operation.OperationCase.CLEAR_SINGLETON -> with(clearSingleton) {
            CrdtEntity.Operation.ClearSingleton(
                actor = actor,
                clock = fromProto(versionMap),
                field = field
            )
        }
        CrdtEntityProto.Operation.OperationCase.ADD_TO_SET -> with(addToSet) {
            CrdtEntity.Operation.AddToSet(
                actor = actor,
                clock = fromProto(versionMap),
                field = field,
                added = added.toCrdtEntityReference()
            )
        }
        CrdtEntityProto.Operation.OperationCase.REMOVE_FROM_SET -> with(removeFromSet) {
            CrdtEntity.Operation.RemoveFromSet(
                actor = actor,
                clock = fromProto(versionMap),
                field = field,
                removed = removed.toCrdtEntityReference()
            )
        }
        CrdtEntityProto.Operation.OperationCase.CLEAR_ALL -> with(clearAll) {
            CrdtEntity.Operation.ClearAll(
                actor = actor,
                clock = fromProto(versionMap)
            )
        }
        CrdtEntityProto.Operation.OperationCase.OPERATION_NOT_SET, null ->
            throw UnsupportedOperationException(
                "Unknown CrdtEntity.Operation type: $operationCase."
            )
    }

/** Serializes a [CrdtEntity.Data] to its proto form. */
fun CrdtEntity.Data.toProto() = CrdtEntityProto.Data.newBuilder()
    .setVersionMap(versionMap.toProto())
    .putAllSingleton(singletons.mapValues { it.value.data.toProto() })
    .putAllCollection(collections.mapValues { it.value.data.toProto() })
    .setCreationTimestampMs(creationTimestamp)
    .setExpirationTimestampMs(expirationTimestamp)
    .setId(id)
    .build()

/** Serializes a [CrdtEntity.Operation] to its proto form. */
fun CrdtEntity.Operation.toProto(): CrdtEntityProto.Operation {
    val proto = CrdtEntityProto.Operation.newBuilder()
    when (this) {
        is CrdtEntity.Operation.SetSingleton -> {
            proto.setSingleton = CrdtEntityProto.Operation.SetSingleton.newBuilder()
                .setVersionMap(clock.toProto())
                .setActor(actor)
                .setField(field)
                .setValue(value.toProto())
                .build()
        }
        is CrdtEntity.Operation.ClearSingleton -> {
            proto.clearSingleton = CrdtEntityProto.Operation.ClearSingleton.newBuilder()
                .setVersionMap(clock.toProto())
                .setActor(actor)
                .setField(field)
                .build()
        }
        is CrdtEntity.Operation.AddToSet -> {
            proto.addToSet = CrdtEntityProto.Operation.AddToSet.newBuilder()
                .setVersionMap(clock.toProto())
                .setActor(actor)
                .setField(field)
                .setAdded(added.toProto())
                .build()
        }
        is CrdtEntity.Operation.RemoveFromSet -> {
            proto.removeFromSet = CrdtEntityProto.Operation.RemoveFromSet.newBuilder()
                .setVersionMap(clock.toProto())
                .setActor(actor)
                .setField(field)
                .setRemoved(removed.toProto())
                .build()
        }
        is CrdtEntity.Operation.ClearAll -> {
            proto.clearAll = CrdtEntityProto.Operation.ClearAll.newBuilder()
                .setVersionMap(clock.toProto())
                .setActor(actor)
                .build()
        }
        else -> throw UnsupportedOperationException("Unsupported CrdtEntity.Operation: $this.")
    }
    return proto.build()
}

/** Reads a [CrdtEntity.Data] out of a [Parcel]. */
fun Parcel.readCrdtEntityData(): CrdtEntity.Data? =
    readProto(CrdtEntityProto.Data.getDefaultInstance())?.toData()

/** Reads a [CrdtEntity.Operation] out of a [Parcel]. */
fun Parcel.readCrdtEntityOperation(): CrdtEntity.Operation? =
    readProto(CrdtEntityProto.Operation.getDefaultInstance())?.toOperation()
