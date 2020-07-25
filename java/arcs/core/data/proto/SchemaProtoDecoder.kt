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

import arcs.core.data.EntityType
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SchemaRegistry

/** Returns the fields in the [SchemaProto] as a Kotlin [SchemaFields] instance. */
private fun SchemaProto.decodeFields(): SchemaFields {
    val singletons = mutableMapOf<FieldName, FieldType>()
    val collections = mutableMapOf<FieldName, FieldType>()
    for ((name, type) in fieldsMap) {
        if (type.hasCollection()) {
            collections[name] = type.collection.collectionType.decodeAsFieldType()
        } else {
            singletons[name] = type.decodeAsFieldType()
        }
    }
    return SchemaFields(singletons, collections)
}

/** Converts a [SchemaProto] proto instance into a Kotlin [Schema] instance. */
fun SchemaProto.decode(): Schema {
    return Schema(
        names = namesList.map { SchemaName(it) }.toSet(),
        fields = decodeFields(),
        hash = hash
    )
}

fun Schema.encode(): SchemaProto {
    return SchemaProto.newBuilder()
        .addAllNames(names.map { it.name })
        .putAllFields(fields.encode())
        .setHash(hash)
        .build()
}

private fun SchemaFields.encode(): Map<String, TypeProto> {
    val result = mutableMapOf<String, TypeProto>()
    singletons.forEach { (name, type) ->
        result[name] = type.encode()
    }
    collections.forEach { (name, type) ->
        result[name] = CollectionTypeProto.newBuilder()
            .setCollectionType(type.encode())
            .build()
            .asTypeProto()
    }
    return result
}

fun FieldType.encode(): TypeProto {
    return when (this) {
        is FieldType.Primitive -> primitiveType.encodePrimitive().asTypeProto()
        is FieldType.EntityRef -> ReferenceTypeProto.newBuilder()
            .setReferredType(EntityType(SchemaRegistry.getSchema(schemaHash)).encode())
            .build()
            .asTypeProto()
        is FieldType.Tuple -> TupleTypeProto.newBuilder()
            .addAllElements(types.map { it.encode() })
            .build()
            .asTypeProto()
        is FieldType.ListOf -> ListTypeProto.newBuilder()
            .setElementType(primitiveType.encode())
            .build()
            .asTypeProto()
        is FieldType.InlineEntity -> EntityTypeProto.newBuilder()
            .setSchema(SchemaRegistry.getSchema(schemaHash).encode())
            .setInline(true)
            .build()
            .asTypeProto()
        else -> throw UnsupportedOperationException("Unsupported FieldType: $this")
    }
}

private fun PrimitiveType.encodePrimitive(): PrimitiveTypeProto = when (this) {
    PrimitiveType.Boolean -> PrimitiveTypeProto.BOOLEAN
    PrimitiveType.Number -> PrimitiveTypeProto.NUMBER
    PrimitiveType.Text -> PrimitiveTypeProto.TEXT
    PrimitiveType.Byte -> PrimitiveTypeProto.BYTE
    PrimitiveType.Short -> PrimitiveTypeProto.SHORT
    PrimitiveType.Int -> PrimitiveTypeProto.INT
    PrimitiveType.Long -> PrimitiveTypeProto.LONG
    PrimitiveType.Char -> PrimitiveTypeProto.CHAR
    PrimitiveType.Float -> PrimitiveTypeProto.FLOAT
    PrimitiveType.Double -> PrimitiveTypeProto.DOUBLE
    PrimitiveType.BigInt -> PrimitiveTypeProto.BIGINT
}
