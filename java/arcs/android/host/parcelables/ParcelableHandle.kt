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
import arcs.core.data.Plan
import arcs.core.storage.StorageKeyParser

/** [Parcelable] variant of [Plan.Handle]. */
data class ParcelableHandle(
    override val actual: Plan.Handle
) : ActualParcelable<Plan.Handle> {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(actual.storageKey.toString())
        parcel.writeType(actual.type, flags)
        parcel.writeAnnotations(actual.annotations, flags)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableHandle> {
        override fun createFromParcel(parcel: Parcel): ParcelableHandle {
            val storageKeyString = requireNotNull(parcel.readString()) {
                "No storageKey found in Parcel"
            }
            val type = requireNotNull(parcel.readType()) {
                "No type found in Parcel"
            }
            val annotations = parcel.readAnnotations()
            return ParcelableHandle(
                Plan.Handle(StorageKeyParser.parse(storageKeyString), type, annotations)
            )
        }

        override fun newArray(size: Int): Array<ParcelableHandle?> =
            arrayOfNulls(size)
    }
}

/** Wraps a [Plan.Handle] as a [ParcelableHandle]. */
fun Plan.Handle.toParcelable() = ParcelableHandle(this)

/** Writes a [Plan.Handle] to a [Parcel]. */
fun Parcel.writeHandle(handle: Plan.Handle, flags: Int) =
    writeTypedObject(handle.toParcelable(), flags)

/** Reads a [Plan.Handle] from a [Parcel]. */
fun Parcel.readHandle(): Plan.Handle? =
    readTypedObject(ParcelableHandle)?.actual
