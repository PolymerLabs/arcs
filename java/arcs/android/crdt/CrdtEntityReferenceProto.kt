package arcs.android.crdt

import android.os.Parcel
import arcs.android.util.readProto
import arcs.core.crdt.CrdtEntity

/** Constructs a [CrdtEntity.ReferenceImpl] from the given [CrdtEntityReferenceProto]. */
fun CrdtEntityReferenceProto.toCrdtEntityReference() = CrdtEntity.ReferenceImpl(id)

/** Serializes a [CrdtEntity.Reference] to its proto form. */
fun CrdtEntity.Reference.toProto() = CrdtEntityReferenceProto.newBuilder().setId(id).build()

/** Reads a [CrdtEntity.ReferenceImpl] out of a [Parcel]. */
fun Parcel.readCrdtEntityReference(): CrdtEntity.ReferenceImpl? =
    readProto(CrdtEntityReferenceProto.getDefaultInstance())?.toCrdtEntityReference()
