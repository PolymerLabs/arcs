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

package arcs.android.crdt

import android.os.Parcel
import android.os.Parcelable
import arcs.android.util.writeProto
import arcs.core.storage.Reference
import arcs.core.storage.StorageKeyParser

/** Parcelable version of [Reference]. */
data class ParcelableReference(override val actual: Reference) : ParcelableReferencable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        super.writeToParcel(parcel, flags)
        parcel.writeString(actual.id)
        parcel.writeString(actual.storageKey.toString())
        actual.version?.let {
            parcel.writeProto(it.toProto())
        } ?: {
            parcel.writeTypedObject(null, flags)
        }()
    }

    override fun describeContents(): Int = 0

    /* Don't use this directly, instead use ParcelableReferencable. */
    internal companion object CREATOR : Parcelable.Creator<ParcelableReference> {
        override fun createFromParcel(parcel: Parcel): ParcelableReference {
            val id = requireNotNull(parcel.readString()) {
                "Required id not found in parcel for ParcelableReference"
            }
            val storageKeyString = requireNotNull(parcel.readString()) {
                "Required storageKey not found in parcel for ParcelableReference"
            }
            val versionMap = parcel.readVersionMap()?.takeIf { it.isNotEmpty() }

            return ParcelableReference(
                Reference(id, StorageKeyParser.parse(storageKeyString), versionMap)
            )
        }

        override fun newArray(size: Int): Array<ParcelableReference?> = arrayOfNulls(size)
    }
}

/** Writes the [Reference] to the receiving [Parcel]. */
fun Parcel.writeReference(reference: Reference, flags: Int) =
    writeTypedObject(ParcelableReference(reference), flags)
