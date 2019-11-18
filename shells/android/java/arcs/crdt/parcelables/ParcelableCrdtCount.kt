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

package arcs.crdt.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.crdt.CrdtCount
import arcs.crdt.internal.Actor
import arcs.crdt.internal.VersionMap

/** Container of [Parcelable] implementations for [CrdtCount]'s data and ops classes. */
object ParcelableCrdtCount {
    /**
     * Parcelable variant of [CrdtCount.Data].
     *
     * **Note:** There is no AIDL parcelable definition provided for this, because it is always
     * passed as a member of another class to an AIDL interface, so none is needed.
     */
    data class Data(
        override val actual: CrdtCount.Data
    ) : ParcelableCrdtData<CrdtCount.Data> {
        override var versionMap: VersionMap = actual.versionMap

        override fun writeToParcel(parcel: Parcel, flags: Int) {
            // Write the version map.
            parcel.writeTypedObject(ParcelableVersionMap(actual.versionMap), flags)

            // Write the number of values as a hint of what to expect.
            parcel.writeInt(actual.values.size)
            // Write the actual values.
            actual.values.forEach { (actor, value) ->
                parcel.writeString(actor)
                parcel.writeInt(value)
            }
        }

        override fun describeContents(): Int = 0

        companion object CREATOR : Parcelable.Creator<Data> {
            override fun createFromParcel(parcel: Parcel): Data {
                // Read the version map.
                val versionMap = requireNotNull(
                    parcel.readTypedObject(ParcelableVersionMap.CREATOR)
                ) { "No VersionMap found in parcel when reading ParcelableCrdtCountData" }
                val values = mutableMapOf<Actor, Int>()

                // Read the item count hint.
                val items = parcel.readInt()
                // Use the item count hint to read the values into the map.
                repeat(items) {
                    values[requireNotNull(parcel.readString())] = parcel.readInt()
                }

                return Data(CrdtCount.Data(values, versionMap.actual))
            }

            override fun newArray(size: Int): Array<Data?> = arrayOfNulls(size)
        }
    }
}
