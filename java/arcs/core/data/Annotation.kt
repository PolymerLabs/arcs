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

/**
 * An Arcs annotations containing additional information on an Arcs manifest element.
 * An Annotation may be attached to a plan, particle, handle, type etc.
 */
data class Annotation(val name: String, val params: Map<String, AnnotationParam>) {
    companion object {
        private val ANNOTATION_PATTERN = "^@([a-zA-Z]+)(\\((.+)\\))?$".toRegex()
        private val PARAM_PATTERN = "^([a-zA-Z]+):(.*)$".toRegex()

        fun fromString(str: String): Annotation {
            val match = requireNotNull(ANNOTATION_PATTERN.matchEntire(str.trim())) {
                "Invalid annotation $str."
            }
            val (_, name, _, paramsStr) = match.groupValues
            val params = mutableMapOf<String, AnnotationParam>()
            if (paramsStr.trim().isNotEmpty()) {
                val paramTokens = paramsStr.trim().split(",")
                paramTokens.forEach {
                    val paramMatch = requireNotNull(PARAM_PATTERN.matchEntire(it.trim())) {
                        "Invalid param $it."
                    }
                    val (_, paramName, paramValue) = paramMatch.groupValues
                    params.put(
                        paramName,
                        AnnotationParam.fromString(paramValue.trim()))
                }
            }
            return Annotation(name, params)
        }
    }
}
