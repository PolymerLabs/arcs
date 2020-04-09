package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.storage.Reference
import arcs.core.storage.StorageKeyParser

/** Constructs a [Reference] from the given [ReferenceProto]. */
fun ReferenceProto.toReference() = Reference(
    id = id,
    storageKey = StorageKeyParser.parse(storageKey),
    version = if (hasVersionMap()) versionMap.toVersionMap() else null
)

/** Serializes a [Reference] to its proto form. */
fun Reference.toProto(): ReferenceProto {
    val proto = ReferenceProto.newBuilder()
        .setId(id)
        .setStorageKey(storageKey.toString())
    version?.let { proto.versionMap = it.toProto() }
    return proto.build()
}

/** Reads a [Reference] out of a [Parcel]. */
fun Parcel.readReference(): Reference? =
    readProto(ReferenceProto.getDefaultInstance())?.toReference()
