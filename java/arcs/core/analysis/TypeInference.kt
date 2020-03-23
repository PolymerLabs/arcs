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

/** The possible nodes that can appear in a type constraint. */
sealed class TypeConstraintNode {
    /** Representation of a handle connection in a particle. */
    data class HandleConnection(
        val particleSpec: ParticleSpec,
        val connectionSpec: HandleConnectionSpec
    ): TypeConstraintNode() {
        override fun toString() = "${particleSpec.name}.${connectionSpec.name}"
    }

    /** Representation of a [Recipe.Handle]. */
    data class Handle(val handle: Recipe.Handle): TypeConstraintNode() {
        override fun toString() = "${handle.name}"
    }
}

typealias TypeConstraint = Pair<TypeConstraintNode, TypeConstraintNode>

/** Returns the type constraint for the given handle connection. */
fun Particle.HandleConnection.getTypeConstraint(particleSpec: ParticleSpec) = TypeConstraint(
    TypeConstraintNode.HandleConnection(particleSpec, spec),
    TypeConstraintNode.Handle(handle)
)

/* Pretty print the equivalence classes of the given recipe. */
fun Recipe.prettyPrintTypeInferenceResults(
    unionFind: UnionFind<TypeConstraintNode, Unit>,
    message: String
) {
    print("$message\n")
    print("Handles:\n")
    handles.values.forEach {
        val node = TypeConstraintNode.Handle(it)
        print("  $node ~ ${unionFind.find(node)}\n")
    }
    print("ConnectionSpecs:\n")
    particles.forEach { particle ->
        particle.handleConnections.forEach {
            val node = TypeConstraintNode.HandleConnection(particle.spec, it.spec)
            print("  $node ~ ${unionFind.find(node)}\n")
        }
    }
}

/** Runs type inference on the given recipe and updates the types of relevant entities in recipe.
 *
 * Specifically, the resolvedType property of [Recipe.Particle.HandleConnection] and [Recipe.Handle]
 * are updated.
 */
fun runTypeInference(recipe: Recipe) {
    var unionFind = UnionFind<TypeConstraintNode, Unit>()
    // Extract the unification constraints.
    //
    // TODO(bgogul): Take care of unification due to type variable names. Note that the automatic
    // creation of type variables in the constructor of [Handle] might create false unification
    // if any of the user-defined type variable names clash with the constructed ones. The generated
    // names to be made unique somehow, first.
    //
    val constraints = recipe.particles.flatMap { particle ->
        particle.handleConnections.map { it.getTypeConstraint(particle.spec) }
    }
    // Process the unification constraints.
    constraints.forEach { (a, b): TypeConstraint -> unionFind.union(a, b) }

    // Display the results for now.
    recipe.prettyPrintTypeInferenceResults(unionFind, "Results of type inference:")
}
