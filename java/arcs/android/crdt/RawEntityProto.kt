package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.data.RawEntity

/** Constructs a [RawEntity] from the given [RawEntityProto]. */
fun fromProto(proto: RawEntityProto): RawEntity {
    val singletons = proto.singletonMap.mapValues { (_, referencable) ->
        fromProto(referencable)
    }
    val collections = proto.collectionMap.mapValues { (_, referencable) ->
        referencable.referencableList.mapTo(mutableSetOf()) { fromProto(it)!! }
    }
    return RawEntity(
        id = proto.id,
        singletons = singletons,
        collections = collections,
        creationTimestamp = proto.creationTimestampMs,
        expirationTimestamp = proto.expirationTimestampMs
    )
}

/** Serializes a [RawEntity] to its proto form. */
fun RawEntity.toProto(): RawEntityProto = RawEntityProto.newBuilder()
    .setId(id)
    .putAllSingleton(
        singletons.mapValues { (_, referencable) ->
            referencable?.toProto() ?: ReferencableProto.getDefaultInstance()
        }
    )
    .putAllCollection(
        collections.mapValues { (_, referencables) ->
            ReferencableSetProto.newBuilder()
                .addAllReferencable(referencables.map { it.toProto() })
                .build()
        }
    )
    .setCreationTimestampMs(creationTimestamp)
    .setExpirationTimestampMs(expirationTimestamp)
    .build()

/** Reads a [RawEntity] out of a [Parcel]. */
fun Parcel.readRawEntity(): RawEntity? =
    readProto(RawEntityProto.getDefaultInstance())?.let { fromProto(it) }
