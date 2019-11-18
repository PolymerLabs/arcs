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
import arcs.crdt.parcelables.ParcelableCrdtType
import arcs.storage.ProxyMessage

/** Parcelable variant of [ProxyMessage.SyncRequest]. */
data class ParcelableSyncRequest(
    override val id: Int?,
    override val crdtType: ParcelableCrdtType,
    override val type: ProxyMessage.Type = ProxyMessage.Type.SyncRequest
) : ParcelableProxyMessage(id, crdtType, type) {
    override fun <Data, Op, ConsumerData> actualize(): ProxyMessage<Data, Op, ConsumerData>
        where Data : CrdtData, Op : CrdtOperation = ProxyMessage.SyncRequest(id)

    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeInt(id ?: NO_ID)
        parcel.writeInt(crdtType.ordinal)
        parcel.writeInt(type.ordinal)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableSyncRequest> {
        override fun createFromParcel(parcel: Parcel): ParcelableSyncRequest {
            val id = parcel.readInt().takeIf { it != NO_ID }
            val crdtType = ParcelableCrdtType.values()[parcel.readInt()]
            val type = ProxyMessage.Type.values()[parcel.readInt()]
            return ParcelableSyncRequest(id, crdtType, type)
        }

        override fun newArray(size: Int): Array<ParcelableSyncRequest?> = arrayOfNulls(size)
    }
}
