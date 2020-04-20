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
import arcs.core.crdt.CrdtCount
import arcs.core.crdt.VersionMap

/** Container of [Parcelable] implementations for [CrdtCount]'s data and ops classes. */
// TODO(b/151449060): Delete this class once all ParcelableCrdtTypes have been converted to protos.
object ParcelableCrdtCount {
    /**
     * Parcelable variant of [CrdtCount.Data].
     *
     * **Note:** There is no AIDL parcelable definition provided for this, because it is always
     * passed as a member of another class to an AIDL interface, not directly.
     */
    data class Data(
        override val actual: CrdtCount.Data
    ) : ParcelableCrdtData<CrdtCount.Data> {
        override var versionMap: VersionMap = actual.versionMap

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.toProto())
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            override fun createFromParcel(parcel: Parcel) = Data(
                requireNotNull(parcel.readCrdtCountData()) {
                    "CrdtCountProto.Data not found in parcel."
                }
            )

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }

    /**
     * Parcelable variants of [CrdtCount.Operation].
     *
     * This class is implemented such that it serves as a multiplexed parcelable for its subclasses:
     *
     * During [writeToParcel], we write the ordinal value of the [OpType] before the subclasses
     * write their bodies.
     *
     * During [createFromParcel], we read the ordinal value of the [OpType] again, use that to find
     * the corresponding enum value, and multiplex down to the appropriate [createFromParcel] method
     * within the subclasses' [CREATOR]s.
     *
     * **Note:** There are no AIDL parcelable definition provided for these, because they are always
     * passed as members of another class to an AIDL interface, not directly.
     */
    class Operation(
        override val actual: CrdtCount.Operation
    ) : ParcelableCrdtOperation<CrdtCount.Operation> {

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.toProto())
        }

        override fun describeContents() = 0

        companion object CREATOR : Parcelable.Creator<Operation> {
            override fun createFromParcel(parcel: Parcel) = Operation(
                requireNotNull(parcel.readCrdtCountOperation()) {
                    "CrdtCountProto.Operation not found in parcel."
                }
            )

            override fun newArray(size: Int): Array<Operation?> = arrayOfNulls(size)
        }
    }
}

/** Returns a [Parcelable] variant of the [CrdtCount.Data] object. */
fun CrdtCount.Data.toParcelable(): ParcelableCrdtData<CrdtCount.Data> =
    ParcelableCrdtCount.Data(this)

/** Converts a [CrdtCount.Operation] to a [Parcelable] variant. */
fun CrdtCount.Operation.toParcelable(): ParcelableCrdtOperation<CrdtCount.Operation> =
    ParcelableCrdtCount.Operation(this)
