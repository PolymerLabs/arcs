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
import arcs.core.crdt.CrdtSingleton

/** Container of [Parcelable] implementations for the data and ops classes of [CrdtSingleton]. */
// TODO(b/151449060): Delete this class once all ParcelableCrdtTypes have been converted to protos.
object ParcelableCrdtSingleton {

    /** Parcelable variant of [CrdtSingleton.Data]. */
    data class Data(
        override val actual: CrdtSingleton.Data<Referencable>
    ) : ParcelableCrdtData<CrdtSingleton.Data<Referencable>> {
        override var versionMap = actual.versionMap

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.toProto())
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            override fun createFromParcel(parcel: Parcel) = Data(
                requireNotNull(parcel.readCrdtSingletonData()) {
                    "CrdtSetProto.Data not found in parcel."
                }
            )

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }

    /**
     * Parcelable variants of [CrdtSingleton.Operation].
     *
     * This class is implemented such that it serves as a multiplexed parcelable for its subclasses.
     * We write the ordinal value of [OpType] first, before parceling the contents of the subclass.
     * The [OpType] is used to figure out the correct subtype when deserialising.
     */
    class Operation(
        override val actual: CrdtSingleton.Operation<Referencable>
    ) : ParcelableCrdtOperation<CrdtSingleton.Operation<Referencable>> {

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            parcel.writeProto(actual.toProto())
        }

        companion object CREATOR : Parcelable.Creator<Operation> {
            override fun createFromParcel(parcel: Parcel) = Operation(
                requireNotNull(parcel.readCrdtSingletonOperation()) {
                    "CrdtSingletonProto.Operation not found in parcel."
                }
            )

            override fun newArray(size: Int): Array<Operation?> = arrayOfNulls(size)
        }

        override fun describeContents(): Int = 0
    }
}

/** Returns a [Parcelable] variant of the [CrdtSingleton.Data] object. */
fun CrdtSingleton.Data<Referencable>.toParcelable(): ParcelableCrdtSingleton.Data =
    ParcelableCrdtSingleton.Data(this)

/** Returns a [Parcelable] variant of the [CrdtSingleton.Operation] object. */
fun CrdtSingleton.Operation<Referencable>.toParcelable():
    ParcelableCrdtOperation<CrdtSingleton.Operation<Referencable>> =
    ParcelableCrdtSingleton.Operation(this)
