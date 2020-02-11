/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.host.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.android.type.readType
import arcs.android.type.writeType
import arcs.core.data.HandleConnectionSpec
import arcs.core.storage.StorageKeyParser

/** [Parcelable] variant of [HandleConnectionSpec]. */
data class ParcelableHandleConnectionSpec(
    override val actual: HandleConnectionSpec
) : ActualParcelable<HandleConnectionSpec> {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(actual.storageKey?.toString())
        parcel.writeType(actual.type, flags)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableHandleConnectionSpec> {
        override fun createFromParcel(parcel: Parcel): ParcelableHandleConnectionSpec {
            val storageKeyString = parcel.readString()
            val type = requireNotNull(parcel.readType()) {
                "No name found in Parcel"
            }

            return ParcelableHandleConnectionSpec(
                HandleConnectionSpec(
                    storageKeyString?.let { StorageKeyParser.parse(it) },
                    type
                )
            )
        }

        override fun newArray(size: Int): Array<ParcelableHandleConnectionSpec?> =
            arrayOfNulls(size)
    }
}

/** Wraps a [HandleConnectionSpec] as a [ParcelableHandleConnectionSpec]. */
fun HandleConnectionSpec.toParcelable(): ParcelableHandleConnectionSpec =
    ParcelableHandleConnectionSpec(this)

/** Writes a [HandleConnectionSpec] to a [Parcel]. */
fun Parcel.writeHandleConnectionSpec(HandleConnectionSpec: HandleConnectionSpec, flags: Int) =
    writeTypedObject(HandleConnectionSpec.toParcelable(), flags)

/** Reads a [HandleConnectionSpec] from a [Parcel]. */
fun Parcel.readHandleConnectionSpec(): HandleConnectionSpec? =
    readTypedObject(ParcelableHandleConnectionSpec)?.actual
