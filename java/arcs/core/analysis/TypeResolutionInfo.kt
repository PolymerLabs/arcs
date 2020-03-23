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

import arcs.core.data.HandleConnectionSpec
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.Recipe.Particle
import arcs.core.type.Type
import arcs.core.util.UnionFind
import arcs.core.util.Result

/** Contains information associated with an equivalence class during type inference. */
sealed class TypeResolutionInfo {
    /** Contains information about the resolved types.
     *
     *  @property canWriteSuperset type that connections in the equivalence class can safely write.
     *          [null] value implies that there are no reads from this handle.
     *  @property canReadSubset type that connections in the equivalence class can safely read.
     *          [null] value implies that there are no writes to this handle.
     */
    data class ResolvedType(
        val canWriteSuperset: Type?,
        val canReadSubset: Type?
    ) : TypeResolutionInfo() {
        /** Creates a type variable info with read and write sets initialized to the same type. */
        constructor(type: Type): this(type, type)

        override fun toString() = "Reads: $canReadSubset, Writes: $canWriteSuperset"

        fun Type.intersection(other: Type): Type? {
            return null
        }

        fun merge(other: ResolvedType): ResolvedType? {
            return null
        }

        fun unify(other: ResolvedType): TypeResolutionInfo {
            val writeSetUnion = when {
                canWriteSuperset == null && other.canWriteSuperset == null -> Result.Ok(null)
                canWriteSuperset == null -> Result.Ok(other.canWriteSuperset)
                other.canWriteSuperset == null -> Result.Ok(canWriteSuperset)
                else -> Type.union(canWriteSuperset, other.canWriteSuperset)
            }
            if (writeSetUnion is Result.Err) {
                return TypeError(writeSetUnion.thrown.message ?: "")
            }
            return ResolvedType(
                canWriteSuperset = (writeSetUnion as Result.Ok).value,
                canReadSubset = canReadSubset
            )
        }
    }

    /* Indicates a type error. */
    data class TypeError(var reason: String) : TypeResolutionInfo()

    fun unify(other: TypeResolutionInfo) = when (this) {
        is ResolvedType -> when (other) {
            is ResolvedType -> (this as ResolvedType).unify(other)
            is TypeError -> other
        }
        is TypeError -> when (other) {
            is ResolvedType -> this
            is TypeError -> TypeError("${this.reason}\n${other.reason}")
        }
    }
}
