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

import arcs.core.data.CollectionType
import arcs.core.data.CountType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.data.ReferenceType
import arcs.core.data.SingletonType
import arcs.core.data.TupleType
import arcs.core.data.TypeVariable
import arcs.core.type.Type

/** Converts a [PrimitiveTypeProto] protobuf instance into a Kotlin [PrimitiveType] instance. */
fun PrimitiveTypeProto.decode() = when (this) {
    PrimitiveTypeProto.TEXT -> PrimitiveType.Text
    PrimitiveTypeProto.NUMBER -> PrimitiveType.Number
    PrimitiveTypeProto.BOOLEAN -> PrimitiveType.Boolean
    PrimitiveTypeProto.UNRECOGNIZED ->
        throw IllegalArgumentException("Unknown PrimitiveTypeProto value.")
}

/** Converts a [PrimitiveTypeProto] protobuf instance into a Kotlin [FieldType] instance. */
fun PrimitiveTypeProto.decodeAsFieldType() = FieldType.Primitive(decode())

/** Converts a [ReferenceTypeProto] protobuf instance into a Kotlin [FieldType] instance. */
fun ReferenceTypeProto.decodeAsFieldType(): FieldType.EntityRef {
    val entitySchema = requireNotNull(decode().entitySchema) {
        "Field that is a reference to an non-entity type is not possible."
    }
    return FieldType.EntityRef(entitySchema.hash)
}

/** Converts a [TupleTypeProto] protobuf instance into a Kotlin [FieldType] instance. */
fun TupleTypeProto.decodeAsFieldType(): FieldType.Tuple = FieldType.Tuple(
    elementsList.map { it.decodeAsFieldType() }
)

/**
 * Converts a [TypeProto] protobuf instance into a Kotlin [FieldType] instance.
 *
 * @throws [IllegalArgumentexception] if the type cannot be converted to [FieldType].
 */
fun TypeProto.decodeAsFieldType() = when (dataCase) {
    TypeProto.DataCase.PRIMITIVE -> primitive.decodeAsFieldType()
    TypeProto.DataCase.REFERENCE -> reference.decodeAsFieldType()
    TypeProto.DataCase.TUPLE -> tuple.decodeAsFieldType()
    TypeProto.DataCase.COLLECTION ->
        throw IllegalArgumentException("Cannot have nested collections in a Schema")
    TypeProto.DataCase.DATA_NOT_SET ->
        throw IllegalArgumentException("Unknown data field in TypeProto.")
    else ->
        throw IllegalArgumentException(
            "Cannot decode a ${dataCase.name} type to a [FieldType].")
}

/** Converts a [EntityTypeProto] protobuf instance into a Kotlin [EntityType] instance. */
fun EntityTypeProto.decode() = EntityType(schema.decode())

/** Converts a [SingletonTypeProto] protobuf instance into a Kotlin [SingletonType] instance. */
fun SingletonTypeProto.decode() = SingletonType(singletonType.decode())

/** Converts a [CollectionTypeProto] protobuf instance into a Kotlin [CollectionType] instance. */
fun CollectionTypeProto.decode() = CollectionType(collectionType.decode())

/** Converts a [ReferenceTypeProto] protobuf instance into a Kotlin [ReferenceType] instance. */
fun ReferenceTypeProto.decode() = ReferenceType(referredType.decode())

/** Converts a [CountTypeProto] protobuf instance into a Kotlin [CountType] instance. */
fun CountTypeProto.decode() = CountType()

/** Converts a [TupleTypeProto] protobuf instance into a Kotlin [TupleType] instance. */
fun TupleTypeProto.decode() = TupleType(elementsList.map { it.decode() })

/** Converts a [TypeVariableProto] protobuf instance into a Kotlin [TypeVariable] instance. */
fun TypeVariableProto.decode() = TypeVariable(
    name,
    if (constraint.constraintType.dataCase == TypeProto.DataCase.DATA_NOT_SET) {
        null
    } else {
        constraint.constraintType.decode()
    }
)

/** Converts a [TypeProto] protobuf instance into a Kotlin [Type] instance. */
// TODO(b/155812915): RefinementExpression.
fun TypeProto.decode(): Type = when (dataCase) {
    TypeProto.DataCase.ENTITY -> entity.decode()
    TypeProto.DataCase.SINGLETON -> singleton.decode()
    TypeProto.DataCase.COLLECTION -> collection.decode()
    TypeProto.DataCase.REFERENCE -> reference.decode()
    TypeProto.DataCase.COUNT -> count.decode()
    TypeProto.DataCase.TUPLE -> tuple.decode()
    TypeProto.DataCase.VARIABLE -> variable.decode()
    TypeProto.DataCase.DATA_NOT_SET ->
        throw IllegalArgumentException("Unknown data field in TypeProto.")
    else ->
        throw IllegalArgumentException(
            "Cannot decode a ${dataCase.name} type to a [Type].")
}
