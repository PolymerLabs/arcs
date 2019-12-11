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
import arcs.core.data.FieldName
import arcs.core.data.SchemaFields

data class ParcelableSchemaFields(val actual: SchemaFields) : Parcelable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeStringList(actual.singletons.toMutableList())
        parcel.writeStringList(actual.collections.toMutableList())
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableSchemaFields> {
        override fun createFromParcel(parcel: Parcel): ParcelableSchemaFields {
            val singletons = mutableListOf<FieldName>()
                .also { parcel.readStringList(it) }
                .toSet()
            val collections = mutableListOf<FieldName>()
                .also { parcel.readStringList(it) }
                .toSet()
            return ParcelableSchemaFields(SchemaFields(singletons, collections))
        }

        override fun newArray(size: Int): Array<ParcelableSchemaFields?> = arrayOfNulls(size)
    }
}

/** Wraps a [SchemaFields] object in a [ParcelableSchemaFields] instance. */
fun SchemaFields.toParcelable(): ParcelableSchemaFields = ParcelableSchemaFields(this)

/** Writes a [SchemaFields] object to a [Parcel]. */
fun Parcel.writeSchemaFields(schemaFields: SchemaFields, flags: Int) =
    writeTypedObject(schemaFields.toParcelable(), flags)

/** Reads a [SchemaFields] object from a [Parcel]. */
fun Parcel.readSchemaFields(): SchemaFields? =
    readTypedObject(ParcelableSchemaFields.CREATOR)?.actual
