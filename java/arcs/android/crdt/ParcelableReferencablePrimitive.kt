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
import arcs.core.data.util.ReferencablePrimitive

/** Parcelable variant of [ReferencablePrimitive]. */
data class ParcelableReferencablePrimitive(
    override val actual: ReferencablePrimitive<*>
) : ParcelableReferencable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        super.writeToParcel(parcel, flags)
        parcel.writeString(actual.id)
    }

    override fun describeContents(): Int = 0

    /** Don't use this directly; use the [ParcelableReferencable] base class instead. */
    internal companion object CREATOR : Parcelable.Creator<ParcelableReferencablePrimitive> {
        override fun createFromParcel(parcel: Parcel): ParcelableReferencablePrimitive {
            val id = requireNotNull(parcel.readString())
            val primitive =
                requireNotNull(
                    ReferencablePrimitive.unwrap(id) as? ReferencablePrimitive<*>
                )
            return ParcelableReferencablePrimitive(primitive)
        }

        override fun newArray(size: Int): Array<ParcelableReferencablePrimitive?> =
            arrayOfNulls(size)
    }
}
