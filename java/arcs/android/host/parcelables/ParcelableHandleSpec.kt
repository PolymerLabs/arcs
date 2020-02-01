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
import arcs.android.type.readSchema
import arcs.android.type.writeSchema
import arcs.core.host.HandleSpec
import arcs.core.storage.StorageKeyParser

/** [Parcelable] variant of [HandleSpec]. */
data class ParcelableHandleSpec(override val actual: HandleSpec) : ActualParcelable<HandleSpec> {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(actual.id)
        parcel.writeString(actual.name)
        parcel.writeString(actual.storageKey?.let { it.toString() })
        parcel.writeStringList(actual.tags.toList())
        parcel.writeSchema(actual.schema, 0)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableHandleSpec> {
        override fun createFromParcel(parcel: Parcel): ParcelableHandleSpec {

            val id = parcel.readString()

            val name = parcel.readString()

            val storageKey = parcel.readString()

            val tags: MutableList<String> = mutableListOf()
            parcel.readStringList(tags)
            requireNotNull(tags) {
                "No tags found in Parcel"
            }

            val schema = requireNotNull(parcel.readSchema()) {
                "No schema found in Parcel"
            }

            return ParcelableHandleSpec(
                HandleSpec(
                    id, name, storageKey?.let { StorageKeyParser.parse(storageKey) },
                    tags.toSet(), schema
                )
            )
        }

        override fun newArray(size: Int): Array<ParcelableHandleSpec?> = arrayOfNulls(size)
    }
}

/** Wraps a [HandleSpec] as a [ParcelableHandleSpec]. */
fun HandleSpec.toParcelable(): ParcelableHandleSpec = ParcelableHandleSpec(this)

/** Writes a [HandleSpec] to a [Parcel]. */
fun Parcel.writeHandleSpec(handleSpec: HandleSpec, flags: Int) =
    writeTypedObject(handleSpec.toParcelable(), flags)

/** Reads a [HandleSpec] from a [Parcel]. */
fun Parcel.readHandleSpec(): HandleSpec? = readTypedObject(ParcelableHandleSpec)?.actual
