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
data class Annotation(val name: String, val params: Map<String, AnnotationParam> = emptyMap()) {

    fun getParam(name: String): AnnotationParam {
        return requireNotNull(params[name]) {
            "Annotation '$this.name' missing '$name' parameter"
        }
    }

    fun getStringParam(paramName: String): String {
        val paramValue = getParam(paramName)
        require(paramValue is AnnotationParam.Str) {
            "Annotation param $paramName must be string, instead got $paramValue"
        }
        return paramValue.value
    }

    fun getOptionalStringParam(paramName: String): String? {
        return if (params.containsKey(paramName)) getStringParam(paramName) else null
    }

    companion object {
        fun createArcId(id: String) = Annotation("arcId", mapOf("id" to AnnotationParam.Str(id)))
        // Deprecated: use createArcId instead.
        fun arcId(id: String) = createArcId(id)

        fun createTtl(value: String) = Annotation(
            "ttl",
            mapOf("value" to AnnotationParam.Str(value))
        )

        fun createCapability(name: String) = Annotation(name)

        /**
         * Returns an annotation indicating that a particle is an egress particle.
         *
         * @param egressType optional egress type for the particle
         */
        fun createEgress(egressType: String? = null): Annotation {
            val params = mutableMapOf<String, AnnotationParam>()
            if (egressType != null) {
                params["type"] = AnnotationParam.Str(egressType)
            }
            return Annotation("egress", params)
        }

        /** Returns an annotation indicating the name of the policy which governs a recipe. */
        fun createPolicy(policyName: String): Annotation {
            return Annotation("policy", mapOf("name" to AnnotationParam.Str(policyName)))
        }

        /** Annotation indicating that a particle is isolated. */
        val isolated = Annotation("isolated")
    }
}
