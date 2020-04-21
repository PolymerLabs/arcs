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

package arcs.android.crdt

import android.os.Parcel
import android.os.Parcelable
import arcs.android.util.writeProto
import arcs.core.crdt.CrdtEntity

/** Container of [Parcelable] implementations for the data and ops classes of [CrdtEntity]. */
// TODO(b/151449060): Delete this class once all ParcelableCrdtTypes have been converted to protos.
object ParcelableCrdtEntity {

    /** Parcelable variant of [CrdtEntity.Data]. */
    data class Data(
        override val actual: CrdtEntity.Data
    ) : ParcelableCrdtData<CrdtEntity.Data> {
        override var versionMap = actual.versionMap

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.toProto())
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            @Suppress("UNCHECKED_CAST")
            override fun createFromParcel(parcel: Parcel) = Data(
                requireNotNull(parcel.readCrdtEntityData()) {
                    "CrdtEntityProto.Data not found in parcel."
                }
            )

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }

    /** Parcelable variant of [CrdtEntity.Operation]. */
    class Operation(
        override val actual: CrdtEntity.Operation
    ) : ParcelableCrdtOperation<CrdtEntity.Operation> {

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.toProto())
        }

        companion object CREATOR : Parcelable.Creator<Operation> {
            override fun createFromParcel(parcel: Parcel) = Operation(
                requireNotNull(parcel.readCrdtEntityOperation()) {
                    "CrdtEntityProto.Operation not found in parcel."
                }
            )

            override fun newArray(size: Int): Array<Operation?> = arrayOfNulls(size)
        }

        override fun describeContents(): Int = 0
    }
}

/** Returns a [Parcelable] variant of the [CrdtEntity.Data] object. */
fun CrdtEntity.Data.toParcelable(): ParcelableCrdtEntity.Data = ParcelableCrdtEntity.Data(this)

/** Returns a [Parcelable] variant of the [CrdtEntity.Operation] object. */
fun CrdtEntity.Operation.toParcelable(): ParcelableCrdtOperation<CrdtEntity.Operation> =
    ParcelableCrdtEntity.Operation(this)
