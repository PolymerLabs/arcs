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

    fun getParam(name: String): AnnotationParam {
        return requireNotNull(params[name]) {
            "Annotation '$this.name' missing '$name' parameter"
        }
    }

    companion object {
        fun arcId(id: String): Annotation {
            return Annotation("arcId", mapOf("id" to AnnotationParam.Str(id)))
        }
    }
}
