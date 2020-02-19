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

package arcs.android.type

import android.os.Parcel
import android.os.Parcelable
import arcs.core.data.Schema
import arcs.core.data.SchemaName

/** [Parcelable] variant of [Schema]. */
data class ParcelableSchema(val actual: Schema) : Parcelable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeStringList(
            actual.names.mapTo(mutableListOf()) { it.name }
        )
        parcel.writeSchemaFields(actual.fields, flags)
        parcel.writeString(actual.hash)
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableSchema> {
        override fun createFromParcel(parcel: Parcel): ParcelableSchema {
            val names = mutableListOf<String>()
                .also { parcel.readStringList(it) }
                .map { SchemaName(it) }

            val fields = requireNotNull(parcel.readSchemaFields()) {
                "No SchemaFields found in Parcel"
            }

            val hash = requireNotNull(parcel.readString()) {
                "No schema hash found in Parcel"
            }

            return ParcelableSchema(Schema(names, fields, hash))
        }

        override fun newArray(size: Int): Array<ParcelableSchema?> = arrayOfNulls(size)
    }
}

/** Wraps a [Schema] as a [ParcelableSchema]. */
fun Schema.toParcelable(): ParcelableSchema = ParcelableSchema(this)

/** Writes a [Schema] to a [Parcel]. */
fun Parcel.writeSchema(schema: Schema, flags: Int) = writeTypedObject(schema.toParcelable(), flags)

/** Reads a [Schema] from a [Parcel]. */
fun Parcel.readSchema(): Schema? = readTypedObject(ParcelableSchema)?.actual
