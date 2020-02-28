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
