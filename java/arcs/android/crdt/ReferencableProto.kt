package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.data.RawEntity
import arcs.core.storage.Reference

/** Constructs a [Referencable] from the given [ReferencableProto]. */
fun fromProto(proto: ReferencableProto): Referencable? = when (proto.referencableCase) {
    ReferencableProto.ReferencableCase.REFERENCABLE_NOT_SET -> null
    ReferencableProto.ReferencableCase.RAW_ENTITY -> fromProto(proto.rawEntity)
    ReferencableProto.ReferencableCase.CRDT_ENTITY_REFERENCE -> fromProto(proto.crdtEntityReference)
    ReferencableProto.ReferencableCase.REFERENCE -> fromProto(proto.reference)
    ReferencableProto.ReferencableCase.PRIMITIVE -> fromProto(proto.primitive)
    else -> throw UnsupportedOperationException(
        "Unknown ReferencableProto type: ${proto.referencableCase}."
    )
}

/** Serializes a [Referencable] to its proto form. */
fun Referencable.toProto(): ReferencableProto {
    val proto = ReferencableProto.newBuilder()
    when (this) {
        is RawEntity -> proto.rawEntity = toProto()
        is CrdtEntity.ReferenceImpl -> proto.crdtEntityReference = toProto()
        is Reference -> proto.reference = toProto()
        else -> throw UnsupportedOperationException("Unsupported Referencable: $this.")
    }
    return proto.build()
}

/** Reads a [Referencable] out of a [Parcel]. */
fun Parcel.readReferencable(): Referencable? =
    readProto(ReferencableProto.getDefaultInstance())?.let { fromProto(it) }
