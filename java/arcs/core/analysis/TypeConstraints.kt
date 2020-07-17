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
import arcs.core.data.TypeVariable

/** The possible nodes that can appear in a type constraint. */
sealed class TypeConstraintNode {
    /** Representation of a handle connection in a particle. */
    data class HandleConnection(
        val particleSpec: ParticleSpec,
        val connectionSpec: HandleConnectionSpec
    ) : TypeConstraintNode() {
        override fun toString() = "${particleSpec.name}.${connectionSpec.name}"
    }

    /** Representation of a [Recipe.Handle]. */
    data class Handle(val handle: Recipe.Handle) : TypeConstraintNode() {
        override fun toString() = "${handle.name}"
    }
}

/**
 * Represents a type constraint, which captures the fact that the underlying entities,
 * [HandleConnectionSpec] and [Recipe.Handle] should have the same type.
 *
 * The order of the nodes do not matter. i.e., (a, b) is same as (b, a). The type constraints
 * will be used in the type inference for [Recipe] instances.
*/
data class TypeConstraint(val lhs: TypeConstraintNode, val rhs: TypeConstraintNode) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null) return false
        if (this::class != other::class) return false

        other as TypeConstraint
        if (lhs == other.lhs && rhs == other.rhs) return true
        if (lhs == other.rhs && rhs == other.lhs) return true
        return false
    }

    override fun hashCode(): Int = 31 * (lhs.hashCode() + rhs.hashCode())
}

/**
 * Returns the type constraints implied by the connections and type variables in the [Particle].
 *
 * For every [Recipe.Particle.HandleConnection] (say `connection`) in [Particle], a type constraint
 * `(connection.spec, connection.handle)` is added. Further, [HandleConnectionSpec] and [Handle]
 * entities with [TypeVariable] type are grouped by their type variable name, and for each such
 * group `e0`, `e1`, `e2, ..., `en`, the constraints `(e0, e1)`, `(e1, e2)`, ... are added.
*/
fun Particle.getTypeConstraints(): List<TypeConstraint> {
    var typeVariableNodes = mutableMapOf<String, MutableSet<TypeConstraintNode>>()
    val connectionConstraints = handleConnections.map { handleConnection ->
        val specNode = TypeConstraintNode.HandleConnection(spec, handleConnection.spec)
        val handleNode = TypeConstraintNode.Handle(handleConnection.handle)
        val specType = handleConnection.spec.type
        if (specType is TypeVariable) {
            typeVariableNodes.getOrPut(specType.name) { mutableSetOf<TypeConstraintNode>() }
                .add(specNode)
        }
        val handleType = handleConnection.handle.type
        if (handleType is TypeVariable) {
            typeVariableNodes.getOrPut(handleType.name) { mutableSetOf<TypeConstraintNode>() }
                .add(handleNode)
        }
        TypeConstraint(specNode, handleNode)
    }
    val typeVariableConstraints = typeVariableNodes.flatMap {
        it.value.zipWithNext { a, b -> TypeConstraint(a, b) }
    }
    return connectionConstraints + typeVariableConstraints
}
