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
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.SchemaFields
import kotlin.IllegalStateException

data class ParcelableSchemaFields(val actual: SchemaFields) : Parcelable {
    override fun writeToParcel(parcel: Parcel, flags: Int) {
        parcel.writeInt(actual.singletons.size)
        actual.singletons.forEach { (name, type) ->
            parcel.writeString(name)
            parcel.writeFieldType(type)
        }
        parcel.writeInt(actual.collections.size)
        actual.collections.forEach { (name, type) ->
            parcel.writeString(name)
            parcel.writeFieldType(type)
        }
    }

    override fun describeContents(): Int = 0

    companion object CREATOR : Parcelable.Creator<ParcelableSchemaFields> {
        override fun createFromParcel(parcel: Parcel): ParcelableSchemaFields {
            val singletons = mutableMapOf<FieldName, FieldType>()
            repeat(parcel.readInt()) {
                singletons[requireNotNull(parcel.readString())] = parcel.readFieldType()
            }
            val collections = mutableMapOf<FieldName, FieldType>()
            repeat(parcel.readInt()) {
                collections[requireNotNull(parcel.readString())] = parcel.readFieldType()
            }
            return ParcelableSchemaFields(SchemaFields(singletons, collections))
        }

        override fun newArray(size: Int): Array<ParcelableSchemaFields?> = arrayOfNulls(size)

        private fun Parcel.readFieldType(): FieldType =
            when (FieldType.Tag.values()[readInt()]) {
                FieldType.Tag.Primitive -> FieldType.Primitive(PrimitiveType.values()[readInt()])
                FieldType.Tag.EntityRef -> FieldType.EntityRef(requireNotNull(readString()))
                FieldType.Tag.Tuple -> {
                    val collector = mutableListOf<FieldType>()
                    while (readByte() != ')'.toByte()) {
                        when (FieldType.Tag.values()[readInt()]) {
                            FieldType.Tag.Primitive ->
                                collector.add(
                                    FieldType.Primitive(PrimitiveType.values()[readInt()])
                                )
                            FieldType.Tag.EntityRef ->
                                collector.add(
                                    FieldType.EntityRef(requireNotNull(readString()))
                                )
                            FieldType.Tag.Tuple ->
                                throw IllegalStateException(
                                    "Nested [FieldType.Tuple]s are not allowed."
                                )
                        }
                    }
                    FieldType.Tuple(collector.toList())
                }
            }
    }

    private fun Parcel.writeFieldType(type: FieldType) {
        writeInt(type.tag.ordinal)
        // Return Unit to force match to be exhaustive.
        return when (type) {
            is FieldType.Primitive -> writeInt(type.primitiveType.ordinal)
            is FieldType.EntityRef -> writeString(type.schemaHash)
            is FieldType.Tuple -> {
                writeByte('('.toByte())
                type.types.forEachIndexed { idx, elem ->
                    writeFieldType(elem)
                    if (idx != type.types.size - 1) {
                        writeByte('|'.toByte())
                    }
                }
                writeByte(')'.toByte())
            }
        }
    }
}

/** Wraps a [SchemaFields] object in a [ParcelableSchemaFields] instance. */
fun SchemaFields.toParcelable(): ParcelableSchemaFields = ParcelableSchemaFields(this)

/** Writes a [SchemaFields] object to a [Parcel]. */
fun Parcel.writeSchemaFields(schemaFields: SchemaFields, flags: Int) =
    writeTypedObject(schemaFields.toParcelable(), flags)

/** Reads a [SchemaFields] object from a [Parcel]. */
fun Parcel.readSchemaFields(): SchemaFields? =
    readTypedObject(ParcelableSchemaFields)?.actual
