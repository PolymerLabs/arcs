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
import arcs.core.data.FieldType
import arcs.core.data.PrimitiveType
import arcs.core.type.Type

/**
 * Converts a [PrimitiveTypeProto] protobuf instance into a Kotlin [PrimitiveType] instance.
 */
fun PrimitiveTypeProto.decode(): PrimitiveType =
    when (this) {
        PrimitiveTypeProto.TEXT -> PrimitiveType.Text
        PrimitiveTypeProto.NUMBER -> PrimitiveType.Number
        PrimitiveTypeProto.BOOLEAN -> PrimitiveType.Boolean
        PrimitiveTypeProto.UNRECOGNIZED ->
            throw IllegalArgumentException("Unknown PrimitiveTypeProto value.")
    }

/**
 * Converts a [PrimitiveTypeProto] protobuf instance into a Kotlin [FieldType] instance.
 */
fun PrimitiveTypeProto.decodeAsFieldType(): FieldType.Primitive = FieldType.Primitive(decode())

/**
 * Converts a [TypeProto] protobuf instance into a Kotlin [FieldType] instance.
 *
 * @throws [IllegalArgumentexception] if the type cannot be converted to [FieldType].
 */
fun TypeProto.decodeAsFieldType(): FieldType =
    when (getDataCase()) {
        TypeProto.DataCase.PRIMITIVE -> getPrimitive().decodeAsFieldType()
        // TODO: Handle FieldType.EntityRef. It is not clear how it is
        // represented in the proto.
        TypeProto.DataCase.DATA_NOT_SET ->
            throw IllegalArgumentException("Unknown data field in TypeProto.")
        else ->
            throw IllegalArgumentException(
                "Cannot decode a ${getDataCase().name} type to a [FieldType].")
    }

/**
 * Converts a [EntityTypeProto] protobuf instance into a Kotlin [EntityType] instance.
 */
fun EntityTypeProto.decode() = EntityType(getSchema().decode())

/**
 * Converts a [TypeProto] protobuf instance into a Kotlin [Type] instance.
 */
fun TypeProto.decode(): Type =
    // TODO: optional, RefinementExpression.
    when (getDataCase()) {
        TypeProto.DataCase.ENTITY -> getEntity().decode()
        TypeProto.DataCase.COLLECTION, TypeProto.DataCase.REFERENCE,
        TypeProto.DataCase.TUPLE, TypeProto.DataCase.VARIABLE ->
            throw NotImplementedError(
                "Decoding of a ${getDataCase().name} type to a [Type] is not implemented.")
        TypeProto.DataCase.DATA_NOT_SET ->
            throw IllegalArgumentException("Unknown data field in TypeProto.")
        else ->
            throw IllegalArgumentException(
                "Cannot decode a ${getDataCase().name} type to a [FieldType].")
    }
