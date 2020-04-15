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
import arcs.core.common.Referencable
import arcs.core.crdt.CrdtSet

/** Container of [Parcelable] implementations for the data and ops classes of [CrdtSet]. */
// TODO(b/151449060): Delete this class once all ParcelableCrdtTypes have been converted to protos.
object ParcelableCrdtSet {
    /** Parcelable variant of [CrdtSet.DataValue]. */
    data class DataValue(
        val actual: CrdtSet.DataValue<Referencable>
    ) : Parcelable {
        override fun describeContents(): Int = 0

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.toProto())
        }

        companion object CREATOR : Parcelable.Creator<DataValue> {
            override fun createFromParcel(parcel: Parcel) = DataValue(
                requireNotNull(parcel.readCrdtSetDataValue()) {
                    "CrdtSetProto.DataValue not found in parcel."
                }
            )

            override fun newArray(size: Int): Array<DataValue?> = arrayOfNulls(size)
        }
    }

    /** Parcelable variant of [CrdtSet.Data]. */
    data class Data(
        override val actual: CrdtSet.Data<Referencable>
    ) : ParcelableCrdtData<CrdtSet.Data<Referencable>> {
        override var versionMap = actual.versionMap

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.toProto())
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            override fun createFromParcel(parcel: Parcel) = Data(
                requireNotNull(parcel.readCrdtSetData()) {
                    "CrdtSetProto.Data not found in parcel."
                }
            )

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }

    /**
     * Parcelable variants of [CrdtSet.Operation].
     *
     * This class is implemented such that it serves as a multiplexed parcelable for its subclasses.
     */
    class Operation(
        override val actual: CrdtSet.Operation<Referencable>
    ) : ParcelableCrdtOperation<CrdtSet.Operation<Referencable>> {

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.toProto())
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Operation> {
            override fun createFromParcel(parcel: Parcel) = Operation(
                requireNotNull(parcel.readCrdtSetOperation()) {
                    "CrdtSetProto.Operation not found in parcel."
                }
            )

            override fun newArray(size: Int): Array<Operation?> = arrayOfNulls(size)
        }
    }
}

/** Returns a [Parcelable] variant of the [CrdtSet.Data] object. */
fun CrdtSet.Data<Referencable>.toParcelable(): ParcelableCrdtSet.Data =
    ParcelableCrdtSet.Data(this)

/** Returns a [Parcelable] variant of the [CrdtSet.Operation] object. */
fun CrdtSet.Operation<Referencable>.toParcelable():
    ParcelableCrdtOperation<CrdtSet.Operation<Referencable>> =
    ParcelableCrdtSet.Operation(this)
