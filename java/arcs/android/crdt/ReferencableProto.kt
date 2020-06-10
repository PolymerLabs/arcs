package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtEntity
import arcs.core.data.FieldType
import arcs.core.data.RawEntity
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.storage.Reference

/** Constructs a [Referencable] from the given [ReferencableProto]. */
fun ReferencableProto.toReferencable(): Referencable? = when (referencableCase) {
    ReferencableProto.ReferencableCase.REFERENCABLE_NOT_SET -> null
    ReferencableProto.ReferencableCase.RAW_ENTITY -> rawEntity.toRawEntity()
    ReferencableProto.ReferencableCase.CRDT_ENTITY_REFERENCE ->
        crdtEntityReference.toCrdtEntityReference()
    ReferencableProto.ReferencableCase.REFERENCE -> reference.toReference()
    ReferencableProto.ReferencableCase.PRIMITIVE -> primitive.toReferencablePrimitive()
    ReferencableProto.ReferencableCase.PRIMITIVE_LIST -> primitiveList.toReferencableList()
    ReferencableProto.ReferencableCase.REFERENCE_LIST -> referenceList.toReferencableList()
    else -> throw UnsupportedOperationException(
        "Unknown ReferencableProto type: $referencableCase."
    )
}

/** Serializes a [Referencable] to its proto form. */
fun Referencable.toProto(): ReferencableProto {
    val proto = ReferencableProto.newBuilder()
    when (this) {
        is RawEntity -> proto.rawEntity = toProto()
        is CrdtEntity.ReferenceImpl -> proto.crdtEntityReference = toProto()
        is Reference -> proto.reference = toProto()
        is ReferencablePrimitive<*> -> proto.primitive = toProto()
        is ReferencableList<*> -> when (this.itemType) {
            is FieldType.Primitive -> proto.primitiveList = toPrimitiveListProto()
            is FieldType.EntityRef -> proto.referenceList = toReferenceListProto()
            else -> throw UnsupportedOperationException("Unsupported Referencable: $this.")
        }
        else -> throw UnsupportedOperationException("Unsupported Referencable: $this.")
    }
    return proto.build()
}

/** Reads a [Referencable] out of a [Parcel]. */
fun Parcel.readReferencable(): Referencable? =
    readProto(ReferencableProto.getDefaultInstance())?.toReferencable()
