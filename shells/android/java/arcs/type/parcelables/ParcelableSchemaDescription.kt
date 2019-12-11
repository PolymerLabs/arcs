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

package arcs.type.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.core.data.SchemaDescription

/** [Parcelable] variant of [SchemaDescription]. */
data class ParcelableSchemaDescription(val actual: SchemaDescription) : Parcelable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeString(actual.pattern)
        parcel.writeString(actual.plural)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableSchemaDescription> {
        override fun createFromParcel(parcel: Parcel): ParcelableSchemaDescription =
            ParcelableSchemaDescription(SchemaDescription(parcel.readString(), parcel.readString()))

        override fun newArray(size: Int): Array<ParcelableSchemaDescription?> = arrayOfNulls(size)
    }
}

/** Wraps a [SchemaDescription] as a [ParcelableSchemaDescription]. */
fun SchemaDescription.toParcelable(): ParcelableSchemaDescription =
    ParcelableSchemaDescription(this)

/** Writes a [SchemaDescription] to a [Parcel]. */
fun Parcel.writeSchemaDescription(schemaDescription: SchemaDescription, flags: Int) =
    writeTypedObject(schemaDescription.toParcelable(), flags)

/** Reads a [SchemaDescription] from a [Parcel]. */
fun Parcel.readSchemaDescription(): SchemaDescription? =
    readTypedObject(ParcelableSchemaDescription.CREATOR)?.actual
