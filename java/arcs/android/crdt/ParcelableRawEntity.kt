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
import arcs.core.common.Referencable
import arcs.core.data.FieldName
import arcs.core.data.RawEntity

/** Parcelable variant of [RawEntity]. */
data class ParcelableRawEntity(
    override val actual: RawEntity
) : ParcelableReferencable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        super.writeToParcel(parcel, flags)
        parcel.writeString(actual.id)

        parcel.writeInt(actual.singletons.size)
        actual.singletons.forEach { (key, value) ->
            parcel.writeString(key)
            parcel.writeTypedObject(value?.let { ParcelableReferencable(it) }, flags)
        }

        parcel.writeInt(actual.collections.size)
        actual.collections.forEach { (key, set) ->
            parcel.writeString(key)
            parcel.writeInt(set.size)
            set.forEach {
                parcel.writeTypedObject(ParcelableReferencable(it), flags)
            }
        }
        parcel.writeLong(actual.expirationTimestamp)
    }

    override fun describeContents(): Int = 0

    /** Don't use this directly; use the [ParcelableReferencable] base class instead. */
    internal companion object CREATOR : Parcelable.Creator<ParcelableRawEntity> {
        override fun createFromParcel(parcel: Parcel): ParcelableRawEntity {
            val id = requireNotNull(parcel.readString())

            val singletons = mutableMapOf<FieldName, Referencable?>()
            val numSingletons = parcel.readInt()
            repeat(numSingletons) {
                singletons[requireNotNull(parcel.readString())] = parcel.readReferencable()
            }

            val collections = mutableMapOf<FieldName, Set<Referencable>>()
            val numCollections = parcel.readInt()
            repeat(numCollections) {
                val key = requireNotNull(parcel.readString())
                val numElements = parcel.readInt()
                val set = mutableSetOf<Referencable>()
                repeat(numElements) {
                    set.add(requireNotNull(parcel.readReferencable()))
                }
                collections[key] = set
            }

            @Suppress("GoodTime") // use Instant
            val expirationTimestamp = requireNotNull(parcel.readLong())

            val rawEntity = RawEntity(id, singletons, collections, expirationTimestamp)
            return ParcelableRawEntity(rawEntity)
        }

        override fun newArray(size: Int): Array<ParcelableRawEntity?> = arrayOfNulls(size)
    }
}
