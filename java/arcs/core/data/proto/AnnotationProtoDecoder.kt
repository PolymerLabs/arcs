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

private fun AnnotationParamProto.decode(): AnnotationParam {
    return when (valueCase) {
        AnnotationParamProto.ValueCase.STR_VALUE -> AnnotationParam.Str(strValue)
        AnnotationParamProto.ValueCase.NUM_VALUE -> AnnotationParam.Num(numValue)
        AnnotationParamProto.ValueCase.BOOL_VALUE -> AnnotationParam.Bool(boolValue)
        else -> throw UnsupportedOperationException("Invalid [AnnotationParam] type $valueCase.")
    }
}

private fun AnnotationParam.encode(paramName: String): AnnotationParamProto {
    val proto = AnnotationParamProto.newBuilder().setName(paramName)
    when (this) {
        is AnnotationParam.Bool -> proto.boolValue = value
        is AnnotationParam.Str -> proto.strValue = value
        is AnnotationParam.Num -> proto.numValue = value
    }
    return proto.build()
}

/** Converts a [AnnotationProto] into a [Annotation]. */
fun AnnotationProto.decode(): Annotation {
    return Annotation(
        name = name,
        params = paramsList.associate { it.name to it.decode() }
    )
}

/** Converts a [Annotation] into a [AnnotationProto]. */
fun Annotation.encode(): AnnotationProto {
    return AnnotationProto.newBuilder()
        .setName(name)
        .addAllParams(params.map { (name, param) -> param.encode(name) })
        .build()
}
