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

package arcs.core.data.proto

import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName

/** Returns the names in the [SchemaProto] as List<SchemaName>. */
fun SchemaProto.decodeNames() = getNamesList().map { SchemaName(it) }.toSet()

/** Returns the fields in the [SchemaProto] as a Kotlin [SchemaFields] instance. */
fun SchemaProto.decodeFields(): SchemaFields {
    val singletons = mutableMapOf<FieldName, FieldType>()
    val collections = mutableMapOf<FieldName, FieldType>()
    for ((name, type) in fieldsMap) {
        when (type.dataCase) {
            TypeProto.DataCase.PRIMITIVE -> singletons[name] = type.decodeAsFieldType()
            TypeProto.DataCase.REFERENCE -> singletons[name] = type.decodeAsFieldType()
            TypeProto.DataCase.TUPLE -> singletons[name] = type.decodeAsFieldType()
            TypeProto.DataCase.COLLECTION -> collections[name] = type.collection.collectionType.decodeAsFieldType()
            TypeProto.DataCase.DATA_NOT_SET ->
                throw IllegalArgumentException("Unknown data field in TypeProto.")
            else ->
                throw NotImplementedError(
                    "decodeFields for ${type.dataCase.name} is not implemented.")
        }
    }
    return SchemaFields(singletons, collections)
}

/** Converts a [SchemaProto] proto instance into a Kotlin [Schema] instance. */
fun SchemaProto.decode() = Schema(names = decodeNames(), fields = decodeFields(), hash = hash)
