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
import arcs.core.data.Recipe

/**
 * An abstract class that implements dataflow analysis over abstract values of type [V].
 *
 * @param bottom the bottom (i.e., the smallest) value in a the lattice for [V].
 */
abstract class RecipeGraphFixpointIterator<V : AbstractValue<V>>(val bottom: V) {
    /** Results of the fixpoint computation. */
    class FixpointResult<V : AbstractValue<V>>(
        private val bottom: V,
        private val nodeValues: Map<RecipeGraph.Node, V>
    ) {
        /** Returns the value for the given particle. */
        fun getValue(particle: Recipe.Particle): V =
            nodeValues[RecipeGraph.Node.Particle(particle)] ?: bottom

        /** Returns the value for the given handle. */
        fun getValue(handle: Recipe.Handle): V =
            nodeValues[RecipeGraph.Node.Handle(handle)] ?: bottom
    }

    /** State transfer function for a [Recipe.Handle] node. */
    open fun nodeTransfer(handle: Recipe.Handle, input: V): V = input

    /** State transfer function for a [Recipe.Particle] node. */
    open fun nodeTransfer(particle: Recipe.Particle, input: V): V = input

    /** State transfer function for a [Recipe.Handle] -> [Recipe.Particle] edge. */
    open fun edgeTransfer(
        fromHandle: Recipe.Handle,
        toParticle: Recipe.Particle,
        spec: HandleConnectionSpec,
        input: V
    ): V = input

    /** State transfer function for a [Recipe.Particle] -> [Recipe.Handle] edge. */
    open fun edgeTransfer(
        fromParticle: Recipe.Particle,
        toHandle: Recipe.Handle,
        spec: HandleConnectionSpec,
        input: V
    ): V = input

    /**
     * Returns the initial values for the nodes for starting a fixpoint iteration.
     *
     * The nodes in the returned map are used to initialize the worklist for the fixpoint iteration.
     */
    protected abstract fun getInitialValues(graph: RecipeGraph): Map<RecipeGraph.Node, V>

    fun computeFixpoint(graph: RecipeGraph): FixpointResult<V> {
        // TODO(bgogul): If there are identical particles in the recipe, the results will be messed
        // up. Need to fix the issue.
        val nodeValues = getInitialValues(graph).toMutableMap()
        val worklist = nodeValues.keys.toMutableSet()
        while (worklist.isNotEmpty()) {
            // Pick and remove an element from the worklist.
            val current = worklist.first()
            worklist.remove(current)
            val input = nodeValues[current] ?: bottom
            if (input.isBottom) continue
            val output = nodeTransfer(current, input)
            current.successors.forEach { (succ, spec) ->
                val edgeValue = edgeTransfer(current, succ, spec, output)
                val oldValue = nodeValues[succ] ?: bottom
                val newValue = oldValue.join(edgeValue)
                // Add successor to worklist if value changed.
                if (!oldValue.isEquivalentTo(newValue)) {
                    worklist.add(succ)
                    nodeValues[succ] = newValue
                }
            }
        }
        return FixpointResult(bottom, nodeValues.filterNot { (_, value) -> value.isBottom })
    }

    private fun nodeTransfer(node: RecipeGraph.Node, input: V) = when (node) {
        is RecipeGraph.Node.Particle -> nodeTransfer(node.particle, input)
        is RecipeGraph.Node.Handle -> nodeTransfer(node.handle, input)
    }

    private fun edgeTransfer(
        source: RecipeGraph.Node,
        target: RecipeGraph.Node,
        spec: HandleConnectionSpec,
        input: V
    ) = when (source) {
        is RecipeGraph.Node.Particle -> {
            require(target is RecipeGraph.Node.Handle)
            edgeTransfer(source.particle, target.handle, spec, input)
        }
        is RecipeGraph.Node.Handle -> {
            require(target is RecipeGraph.Node.Particle)
            edgeTransfer(source.handle, target.particle, spec, input)
        }
    }
}
