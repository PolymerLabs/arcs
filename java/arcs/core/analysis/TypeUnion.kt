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

package arcs.core.analysis

import arcs.core.data.EntityType
import arcs.core.data.TypeVariable
import arcs.core.type.Type
import arcs.core.util.Result
import arcs.core.util.getOrThrow
import arcs.core.util.resultOf

fun Type.Companion.union(lhs: Type, rhs: Type): Result<Type> {
    require (lhs.tag == rhs.tag) {
        "Cannot compute union of incompatible types ${lhs.tag} and ${rhs.tag}."
    }
    return resultOf {
        when (lhs) {
            is EntityType -> lhs.union(rhs as EntityType).getOrThrow()
            is TypeVariable -> rhs // TODO(bgogul): this is not correct.
            else -> throw NotImplementedError("Union is not implemented for ${lhs.tag}.")
        }
    }
}
