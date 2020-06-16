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

package arcs.core.data

/** [Annotation] parameter's value: may be string, numeric or boolean. */
sealed class AnnotationParam {
    data class Str(val value: String) : AnnotationParam()
    data class Num(val value: Int) : AnnotationParam()
    data class Bool(val value: Boolean) : AnnotationParam()

    companion object {
        private val NUM_VALUE_PATTERN = "-?\\d+".toRegex()
        private val STR_VALUE_PATTERN = "^'(.*)'$".toRegex()

        fun fromString(value: String): AnnotationParam {
            return when (value) {
                "true" -> AnnotationParam.Bool(true)
                "false" -> AnnotationParam.Bool(false)
                else -> {
                    if (value.matches(NUM_VALUE_PATTERN)) AnnotationParam.Num(value.toInt())
                    else {
                        val valueMatch = requireNotNull(STR_VALUE_PATTERN.matchEntire(value)) {
                            "Unexpected annotation value: $value"
                        }
                        AnnotationParam.Str(valueMatch.groupValues[1])
                    }
                }
            }
        }
    }
}
