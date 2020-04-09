package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.data.RawEntity

/** Constructs a [RawEntity] from the given [RawEntityProto]. */
fun RawEntityProto.toRawEntity(): RawEntity {
    val singletons = singletonMap.mapValues { (_, referencable) ->
        referencable.toReferencable()
    }
    val collections = collectionMap.mapValues { (_, referencable) ->
        referencable.referencableList.mapTo(mutableSetOf()) { it.toReferencable()!! }
    }
    return RawEntity(
        id = id,
        singletons = singletons,
        collections = collections,
        creationTimestamp = creationTimestampMs,
        expirationTimestamp = expirationTimestampMs
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
    readProto(RawEntityProto.getDefaultInstance())?.toRawEntity()
