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

/** An abstract class that implements dataflow analysis over abstract values of type [V]. */
abstract class RecipeGraphFixpointIterator<V : AbstractValue<V>> {
    /**
     * Abstract state at the node, i.e., the join of the abstract values along the input edges.
     *
     * Absence of an entry for a node denotes BOTTOM.
     */
    private var nodeValues = mutableMapOf<RecipeGraph.Node, V>()

    /** State transformer for a [Recipe.Handle] node. */
    open fun transform(handle: Recipe.Handle, input: V): V = input

    /** State transformer for a [Recipe.Particle] node. */
    open fun transform(particle: Recipe.Particle, input: V): V = input

    /** State transformer for a [Recipe.Handle] -> [Recipe.Particle] edge. */
    open fun transform(
        handle: Recipe.Handle,
        particle: Recipe.Particle,
        spec: HandleConnectionSpec,
        input: V
    ): V = input

    /** State transformer for a [Recipe.Particle] -> [Recipe.Handle] edge. */
    open fun transform(
        particle: Recipe.Particle,
        handle: Recipe.Handle,
        spec: HandleConnectionSpec,
        input: V
    ): V = input

    /**
     * Returns the initial values for the nodes for starting a fixpoint iteration.
     *
     * The nodes in the returned map are used to initialize the worklist for the fixpoint iteration.
     */
    abstract fun getInitialValues(graph: RecipeGraph): Map<RecipeGraph.Node, V>

    /** Returns the value for the given particle. Returns null if the value is BOTTOM. */
    fun getValue(particle: Recipe.Particle): V? = nodeValues[RecipeGraph.Node.Particle(particle)]

    /** Returns the value for the given handle. Returns null if the value is BOTTOM. */
    fun getValue(handle: Recipe.Handle): V? = nodeValues[RecipeGraph.Node.Handle(handle)]

    fun computeFixpoint(graph: RecipeGraph) {
        // TODO(bgogul): If there are identical particles in the recipe, the results will be messed
        // up. Need to fix the issue.
        nodeValues = getInitialValues(graph).toMutableMap()
        val worklist = nodeValues.keys.toMutableSet()
        while (worklist.isNotEmpty()) {
            // Pick and remove an element from the worklist.
            val current = worklist.first()
            worklist.remove(current)
            val input = nodeValues[current]
            // Treating as BOTTOM now. See `successors.forEach` below as well.
            if (input == null) continue
            val output = transform(current, input)
            current.successors.forEach { (succ, spec) ->
                val edgeValue = transform(current, succ, spec, output)
                val oldValue = nodeValues[succ]
                val newValue = oldValue?.join(edgeValue) ?: edgeValue
                val changed = oldValue?.isEquivalentTo(newValue)?.not() ?: true
                if (changed) {
                    worklist.add(succ)
                    nodeValues[succ] = newValue
                }
            }
        }
    }

    private fun transform(node: RecipeGraph.Node, input: V) = when (node) {
        is RecipeGraph.Node.Particle -> transform(node.particle, input)
        is RecipeGraph.Node.Handle -> transform(node.handle, input)
    }

    private fun transform(
        src: RecipeGraph.Node,
        tgt: RecipeGraph.Node,
        spec: HandleConnectionSpec,
        input: V
    ) = when (src) {
        is RecipeGraph.Node.Particle -> {
            require(tgt is RecipeGraph.Node.Handle)
            transform(src.particle, tgt.handle, spec, input)
        }
        is RecipeGraph.Node.Handle -> {
            require(tgt is RecipeGraph.Node.Particle)
            transform(src.handle, tgt.particle, spec, input)
        }
    }
}
