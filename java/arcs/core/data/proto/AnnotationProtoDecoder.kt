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

import arcs.core.data.Annotation
import arcs.core.data.AnnotationParam

fun AnnotationParamProto.decode(): AnnotationParam {
    return when (valueCase) {
        AnnotationParamProto.ValueCase.STR_VALUE -> AnnotationParam.Str(strValue)
        AnnotationParamProto.ValueCase.NUM_VALUE -> AnnotationParam.Num(numValue)
        AnnotationParamProto.ValueCase.BOOL_VALUE -> AnnotationParam.Bool(boolValue)
        else -> throw IllegalArgumentException("Cannot decode a [AnnotationParamProto].")
    }
}

/** Converts a [AnnotationProto] into a [Annotation]. */
fun AnnotationProto.decode(): Annotation {
    val paramMap: Map<String, AnnotationParam> = paramsList.map { it.name to it.decode() }.toMap()
    return Annotation(name, paramMap)
}
