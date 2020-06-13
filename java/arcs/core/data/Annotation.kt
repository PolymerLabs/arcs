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

/** A class containing an annotation. */
data class Annotation(val name: String, val params: Map<String, AnnotationParam>) {
    companion object {
        private val ANNOTATION_PATTERN = "^([a-zA-Z]+)(\\((.+)\\))?$".toRegex()
        private val PARAM_PATTERN = "^([a-zA-Z]+):(.*)$".toRegex()

        fun fromString(str: String): List<Annotation> {
            val tokens = str.split("@")
            return tokens.drop(1).map {
                val match = requireNotNull(ANNOTATION_PATTERN.matchEntire(it.trim())) {
                    "invalid annotation $it"
                }
                val params = mutableMapOf<String, AnnotationParam>()
                if (match.groupValues[3].length > 0) {
                    val paramTokens = match.groupValues[3].split(",")
                    paramTokens.forEach {
                        val paramMatch = requireNotNull(PARAM_PATTERN.matchEntire(it.trim())) {
                            "invalid param $it"
                        }
                        params.put(
                            paramMatch.groupValues[1],
                            AnnotationParam.fromString(paramMatch.groupValues[2].trim()))
                    }
                }
                Annotation(match.groupValues[1], params)
            }
        }
    }
}
