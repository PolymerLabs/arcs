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
import arcs.core.crdt.VersionMap

/** [Parcelable] wrapper for [VersionMap]. */
data class ParcelableVersionMap(
    val actual: VersionMap
) : Parcelable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        val actors = actual.actors.toList()
        parcel.writeInt(actors.size)
        actors.forEach {
            parcel.writeString(it)
            parcel.writeInt(actual[it])
        }
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableVersionMap> {
        override fun createFromParcel(parcel: Parcel): ParcelableVersionMap {
            val actual = VersionMap()
            val entries = parcel.readInt()
            repeat(entries) {
                actual[requireNotNull(parcel.readString())] = requireNotNull(parcel.readInt())
            }
            return ParcelableVersionMap(actual)
        }

        override fun newArray(size: Int): Array<ParcelableVersionMap?> = arrayOfNulls(size)
    }
}

/** Converts a [VersionMap] into a [ParcelableVersionMap]. */
fun VersionMap.toParcelable(): ParcelableVersionMap = ParcelableVersionMap(this)

/** Reads a [VersionMap] out of a [Parcel]. */
fun Parcel.readVersionMap(): VersionMap? = readTypedObject(ParcelableVersionMap)?.actual
