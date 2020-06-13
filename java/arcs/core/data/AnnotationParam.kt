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

/** A class containing an annotation param. */
sealed class AnnotationParam(strValue: String?, numValue: Int? = null, boolValue: Boolean? = null) {
    data class Str(val strValue: String) : AnnotationParam(strValue)
    data class Num(val numValue: Int) : AnnotationParam(null, numValue)
    data class Bool(val boolValue: Boolean) : AnnotationParam(null, null, boolValue)

    fun strValue(): String {
        if (this is AnnotationParam.Str) return strValue
        throw UnsupportedOperationException("Unsupported strValue: $this.")
    }

    fun numValue(): Int {
        if (this is AnnotationParam.Num) return numValue
        throw UnsupportedOperationException("Unsupported numValue: $this.")
    }

    fun boolValue(): Boolean {
        if (this is AnnotationParam.Bool) return boolValue
        throw UnsupportedOperationException("Unsupported boolValue: $this.")
    }

    companion object {
        private val STR_VALUE_PATTERN = "^'(.*)'$".toRegex()

        fun fromString(value: String): AnnotationParam {
            return when (value) {
                "true" -> AnnotationParam.Bool(true)
                "false" -> AnnotationParam.Bool(false)
                else -> {
                    if (value.matches("-?\\d+".toRegex())) AnnotationParam.Num(value.toInt())
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
