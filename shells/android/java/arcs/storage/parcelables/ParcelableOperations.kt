/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.storage.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.crdt.CrdtData
import arcs.crdt.CrdtOperation
import arcs.crdt.parcelables.ParcelableCrdtOperation
import arcs.crdt.parcelables.ParcelableCrdtType
import arcs.storage.ProxyMessage

/** Parcelable variant of [ProxyMessage.Operations]. */
data class ParcelableOperations(
    val operations: List<ParcelableCrdtOperation<*>>,
    override val id: Int?,
    override val crdtType: ParcelableCrdtType,
    override val type: ProxyMessage.Type = ProxyMessage.Type.Operations
) : ParcelableProxyMessage(id, crdtType, type) {
    @Suppress("UNCHECKED_CAST")
    override fun <Data, Op, ConsumerData> actualize(): ProxyMessage<Data, Op, ConsumerData>
        where Data : CrdtData, Op : CrdtOperation =
        ProxyMessage.Operations(operations.map { it.actual as Op }, id)

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeInt(id ?: NO_ID)
        parcel.writeInt(crdtType.ordinal)
        parcel.writeInt(type.ordinal)
        // We write the operations last, so when createFromParcel is called, we can refer to the
        // crdtType to rehydrate the operations.
        parcel.writeTypedList(operations)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR :
        Parcelable.Creator<ParcelableOperations> {
        override fun createFromParcel(parcel: Parcel): ParcelableOperations {
            val id = parcel.readInt().takeIf { it != NO_ID }
            val crdtType = ParcelableCrdtType.values()[parcel.readInt()]
            val type = ProxyMessage.Type.values()[parcel.readInt()]
            val ops = requireNotNull(
                parcel.createTypedArrayList(
                    requireNotNull(crdtType.crdtOperationCreator) {
                        "No ParcelableCrdtOperation creator for $crdtType"
                    }
                )
            ) { "ParcelableCrdtOperations not found in parcel for Operations proxy message" }

            return ParcelableOperations(ops, id, crdtType, type)
        }

        override fun newArray(size: Int): Array<ParcelableOperations?> = arrayOfNulls(size)
    }
}
