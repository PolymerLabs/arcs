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

import android.annotation.TargetApi
import android.os.Build
import android.os.Parcel
import android.os.Parcelable
import arcs.crdt.CrdtData
import arcs.crdt.CrdtOperation
import arcs.crdt.parcelables.ParcelableCrdtData
import arcs.crdt.parcelables.ParcelableCrdtType
import arcs.storage.ProxyMessage

/** Parcelable variant of [ProxyMessage.ModelUpdate]. */
@TargetApi(Build.VERSION_CODES.M)
data class ParcelableModelUpdate(
    val model: ParcelableCrdtData<*>,
    override val id: Int?,
    override val crdtType: ParcelableCrdtType,
    override val type: ProxyMessage.Type = ProxyMessage.Type.ModelUpdate
) : ParcelableProxyMessage(id, crdtType, type) {
    @Suppress("UNCHECKED_CAST")
    override fun <Data, Op, ConsumerData> actualize(): ProxyMessage<Data, Op, ConsumerData>
        where Data : CrdtData, Op : CrdtOperation =
        ProxyMessage.ModelUpdate(model.actual as Data, id)

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeInt(id ?: NO_ID)
        parcel.writeInt(crdtType.ordinal)
        parcel.writeInt(type.ordinal)
        // We write the model last, so when createFromParcel is called, we can refer to the crdtType
        // to rehydrate the model.
        parcel.writeTypedObject(model, 0)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR :
        Parcelable.Creator<ParcelableModelUpdate> {
        override fun createFromParcel(parcel: Parcel): ParcelableModelUpdate {
            val id = parcel.readInt().takeIf { it != NO_ID }
            val crdtType = ParcelableCrdtType.values()[parcel.readInt()]
            val type = ProxyMessage.Type.values()[parcel.readInt()]
            val model = requireNotNull(
                parcel.readTypedObject(
                    requireNotNull(crdtType.crdtDataCreator) {
                        "No ParcelableCrdtData creator for $crdtType"
                    }
                )
            ) { "ParcelableCrdtData not found in parcel for ModelUpdate proxy message" }
            return ParcelableModelUpdate(model, id, crdtType, type)
        }

        override fun newArray(size: Int): Array<ParcelableModelUpdate?> = arrayOfNulls(size)
    }
}
