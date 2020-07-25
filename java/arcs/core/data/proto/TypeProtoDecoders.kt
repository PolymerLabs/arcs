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

/** Converts a [PrimitiveTypeProto] protobuf instance into a Kotlin [FieldType] instance. */
fun PrimitiveTypeProto.decodeAsFieldType(): FieldType.Primitive {
    return FieldType.Primitive(
        when (this) {
            PrimitiveTypeProto.TEXT -> PrimitiveType.Text
            PrimitiveTypeProto.NUMBER -> PrimitiveType.Number
            PrimitiveTypeProto.BOOLEAN -> PrimitiveType.Boolean
            PrimitiveTypeProto.BIGINT -> PrimitiveType.BigInt
            PrimitiveTypeProto.BYTE -> PrimitiveType.Byte
            PrimitiveTypeProto.SHORT -> PrimitiveType.Short
            PrimitiveTypeProto.INT -> PrimitiveType.Int
            PrimitiveTypeProto.LONG -> PrimitiveType.Long
            PrimitiveTypeProto.CHAR -> PrimitiveType.Char
            PrimitiveTypeProto.FLOAT -> PrimitiveType.Float
            PrimitiveTypeProto.DOUBLE -> PrimitiveType.Double
            PrimitiveTypeProto.UNRECOGNIZED ->
                throw IllegalArgumentException("Unknown PrimitiveTypeProto value.")
        }
    )
}

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

/** Converts a [ListTypeProto] to a [FieldType.ListOf] instance. */
fun ListTypeProto.decodeAsFieldType(): FieldType.ListOf {
    return FieldType.ListOf(elementType.decodeAsFieldType())
}

/**
 * Converts a [ListTypeProto] to a [FieldType.InlineEntity] instance. Only works for inline
 * entities.
 */
fun EntityTypeProto.decodeAsFieldType(): FieldType.InlineEntity {
    require(inline) { "Cannot decode non-inline entities to FieldType.InlineEntity" }
    return FieldType.InlineEntity(schema.hash)
}

/**
 * Converts a [TypeProto] protobuf instance into a Kotlin [FieldType] instance.
 *
 * @throws [IllegalArgumentexception] if the type cannot be converted to [FieldType].
 */
fun TypeProto.decodeAsFieldType(): FieldType = when (dataCase) {
    TypeProto.DataCase.PRIMITIVE -> primitive.decodeAsFieldType()
    TypeProto.DataCase.REFERENCE -> reference.decodeAsFieldType()
    TypeProto.DataCase.TUPLE -> tuple.decodeAsFieldType()
    TypeProto.DataCase.LIST -> list.decodeAsFieldType()
    TypeProto.DataCase.ENTITY -> entity.decodeAsFieldType()
    TypeProto.DataCase.DATA_NOT_SET, null ->
        throw IllegalArgumentException("Unknown data field in TypeProto.")
    TypeProto.DataCase.VARIABLE,
    TypeProto.DataCase.SINGLETON,
    TypeProto.DataCase.COLLECTION,
    TypeProto.DataCase.COUNT ->
        throw IllegalArgumentException("Cannot decode non-field type $dataCase to FieldType.")
}

/**
 * Converts a [EntityTypeProto] protobuf instance into a Kotlin [EntityType] instance. Does not work
 * for inline entities.
 */
fun EntityTypeProto.decode(): EntityType {
    require(!inline) { "Cannot decode inline entities to EntityType." }
    return EntityType(schema.decode())
}

/** Converts a [SingletonTypeProto] protobuf instance into a Kotlin [SingletonType] instance. */
fun SingletonTypeProto.decode() = SingletonType(singletonType.decode())

/** Converts a [CollectionTypeProto] protobuf instance into a Kotlin [CollectionType] instance. */
fun CollectionTypeProto.decode() = CollectionType(collectionType.decode())

/** Converts a [ReferenceTypeProto] protobuf instance into a Kotlin [ReferenceType] instance. */
fun ReferenceTypeProto.decode() = ReferenceType(referredType.decode())

/** Converts a [TupleTypeProto] protobuf instance into a Kotlin [TupleType] instance. */
fun TupleTypeProto.decode() = TupleType(elementsList.map { it.decode() })

/** Converts a [TypeVariableProto] protobuf instance into a Kotlin [TypeVariable] instance. */
fun TypeVariableProto.decode() = TypeVariable(
    name,
    if (hasConstraint()) constraint.constraintType.decode() else null
)

/** Converts a [TypeProto] protobuf instance into a Kotlin [Type] instance. */
// TODO(b/155812915): RefinementExpression.
fun TypeProto.decode(): Type = when (dataCase) {
    TypeProto.DataCase.ENTITY -> entity.decode()
    TypeProto.DataCase.SINGLETON -> singleton.decode()
    TypeProto.DataCase.COLLECTION -> collection.decode()
    TypeProto.DataCase.REFERENCE -> reference.decode()
    TypeProto.DataCase.COUNT -> CountType()
    TypeProto.DataCase.TUPLE -> tuple.decode()
    TypeProto.DataCase.VARIABLE -> variable.decode()
    TypeProto.DataCase.PRIMITIVE, TypeProto.DataCase.LIST ->
        throw IllegalArgumentException("Cannot decode FieldType $dataCase to Type.")
    TypeProto.DataCase.DATA_NOT_SET, null ->
        throw IllegalArgumentException("Unknown data field in TypeProto.")
}

/** Encodes a [Type] as a [TypeProto]. */
fun Type.encode(): TypeProto = when (this) {
    is TypeVariable -> {
        val proto = TypeVariableProto.newBuilder().setName(name)
        constraint?.let {
            proto.constraint = ConstraintInfo.newBuilder().setConstraintType(it.encode()).build()
        }
        proto.build().asTypeProto()
    }
    is EntityType -> EntityTypeProto.newBuilder()
        .setSchema(entitySchema.encode())
        .build()
        .asTypeProto()
    is SingletonType<*> -> SingletonTypeProto.newBuilder()
        .setSingletonType(containedType.encode())
        .build()
        .asTypeProto()
    is CollectionType<*> -> CollectionTypeProto.newBuilder()
        .setCollectionType(containedType.encode())
        .build()
        .asTypeProto()
    is ReferenceType<*> -> ReferenceTypeProto.newBuilder()
        .setReferredType(containedType.encode())
        .build()
        .asTypeProto()
    is TupleType -> TupleTypeProto.newBuilder()
        .addAllElements(elementTypes.map { it.encode() })
        .build()
        .asTypeProto()
    is CountType -> CountTypeProto.getDefaultInstance().asTypeProto()
    else -> throw UnsupportedOperationException("Unsupported Type: $this")
}

// Convenience methods for wrapping specific subtypes in a TypeProto.

fun SingletonTypeProto.asTypeProto() = TypeProto.newBuilder().setSingleton(this).build()

fun CollectionTypeProto.asTypeProto() = TypeProto.newBuilder().setCollection(this).build()

fun PrimitiveTypeProto.asTypeProto() = TypeProto.newBuilder().setPrimitive(this).build()

fun ReferenceTypeProto.asTypeProto() = TypeProto.newBuilder().setReference(this).build()

fun TupleTypeProto.asTypeProto() = TypeProto.newBuilder().setTuple(this).build()

fun ListTypeProto.asTypeProto() = TypeProto.newBuilder().setList(this).build()

fun EntityTypeProto.asTypeProto() = TypeProto.newBuilder().setEntity(this).build()

fun TypeVariableProto.asTypeProto() = TypeProto.newBuilder().setVariable(this).build()

fun CountTypeProto.asTypeProto() = TypeProto.newBuilder().setCount(this).build()
