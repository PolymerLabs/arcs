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

import arcs.core.data.PrimitiveType

/**
 * Converts a [PrimitiveTypeProto] protobuf instance into a native kotlin [PrimitiveType] instance.
 */
fun PrimitiveTypeProto.decode(): PrimitiveType =
    when (this) {
        PrimitiveTypeProto.TEXT -> PrimitiveType.Text
        PrimitiveTypeProto.NUMBER -> PrimitiveType.Number
        PrimitiveTypeProto.BOOLEAN -> PrimitiveType.Boolean
        PrimitiveTypeProto.UNRECOGNIZED ->
            throw IllegalArgumentException("Unknown PrimitiveTypeProto value.")
    }
