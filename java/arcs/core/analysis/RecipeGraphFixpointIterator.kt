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
import arcs.core.util.TaggedLog

/** Returns the name of the underlying handle or particle. */
fun RecipeGraph.Node.name() = when (this) {
    is RecipeGraph.Node.Particle -> "p:${particle.spec.name}"
    is RecipeGraph.Node.Handle -> "h:${handle.name}"
}

/**
 * An abstract class that implements dataflow analysis over abstract values of type [V].
 *
 * @param bottom the bottom (i.e., the smallest) value in a the lattice for [V].
 */
abstract class RecipeGraphFixpointIterator<V : AbstractValue<V>>(val bottom: V) {
    /** Results of the fixpoint computation. */
    class FixpointResult<V : AbstractValue<V>>(
        private val graph: RecipeGraph,
        private val bottom: V,
        private val nodeValues: Map<RecipeGraph.Node, V>
    ) {
        /** Returns the value for the given particle. */
        fun getValue(particle: Recipe.Particle): V =
            nodeValues[RecipeGraph.Node.Particle(particle)] ?: bottom

        /** Returns the value for the given handle. */
        fun getValue(handle: Recipe.Handle): V =
            nodeValues[RecipeGraph.Node.Handle(handle)] ?: bottom

        override fun toString(): String = toString("", null)

        /** Displays the fixpoint results in human readable form for debugging ONLY. */
        fun toString(
            message: String = "",
            prettyPrinter: ((V, String) -> String)? = null
        ): String {
            val builder = StringBuilder()
            builder.append("----Fixpoint ($message)----\n")

            builder.append("Particles:\n")
            graph.nodes
                .filterIsInstance<RecipeGraph.Node.Particle>()
                .forEach {
                    builder.append("${it.particle.spec.name}:\n")
                    val value = getValue(it.particle)
                    builder.append(prettyPrinter?.let { prettyPrinter(value, " ") } ?: "$value")
                    builder.append("\n")
                }

            builder.append("Handles:\n")
            graph.nodes
                .filterIsInstance<RecipeGraph.Node.Handle>()
                .forEach {
                    builder.append("${it.handle.name}:\n")
                    val value = getValue(it.handle)
                    builder.append(prettyPrinter?.let { prettyPrinter(value, " ") } ?: "$value")
                    builder.append("\n")
                }

            builder.append("----Fixpoint (end)----\n")
            return builder.toString()
        }
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

    /** State transfer function for a [Recipe.Handle] -> [Recipe.Handle] join edge. */
    open fun edgeTransfer(
        fromHandle: Recipe.Handle,
        toHandle: Recipe.Handle,
        spec: RecipeGraph.JoinSpec,
        input: V
    ): V = input

    /**
     * Returns the initial values for the nodes for starting a fixpoint iteration.
     *
     * The nodes in the returned map are used to initialize the worklist for the fixpoint iteration.
     */
    protected abstract fun getInitialValues(graph: RecipeGraph): Map<RecipeGraph.Node, V>

    private val log = TaggedLog { "FixpointIterator" }

    /**
     * Computes the fix point for the [graph].
     *
     * The users may pass a [prettyPrinter] lambda to  pretty print the results while debugging. The
     * [prettyPrinter] takes the value to print along with a line prefix for indentation purposes.
     */
    fun computeFixpoint(
        graph: RecipeGraph,
        prettyPrinter: ((V, String) -> String)? = null
    ): FixpointResult<V> {
        // TODO(bgogul): If there are identical particles in the recipe, the results will be messed
        // up. Need to fix the issue.
        val nodeValues = getInitialValues(graph).toMutableMap()
        val worklist = nodeValues.keys.toMutableSet()
        val prettyPrint = { v: V, marginPrefix: String ->
            prettyPrinter?.let { it(v, marginPrefix) } ?: "$v"
        }
        while (worklist.isNotEmpty()) {
            // Pick and remove an element from the worklist.
            val current = worklist.first()

            worklist.remove(current)
            val input = nodeValues[current] ?: bottom
            log.debug {
                """
                  |Processing node ${current.name()}:
                     ${prettyPrint(input, "|  ")}
                """.trimMargin()
            }
            if (input.isBottom) continue
            val output = nodeTransfer(current, input)
            current.successors.forEach { (succ, spec) ->
                val edgeValue = edgeTransfer(current, succ, spec, output)
                val oldValue = nodeValues[succ] ?: bottom
                val newValue = oldValue.join(edgeValue)
                log.debug {
                    """
                      |Processing Edge ${current.name()} -> ${succ.name()}:
                      |  changed : ${!oldValue.isEquivalentTo(newValue)}
                      |  edge:
                           ${prettyPrint(edgeValue, "|    ")}
                      |  old:
                           ${prettyPrint(oldValue, "|    ")}
                      |  new:
                           ${prettyPrint(newValue, "|    ")}
                    """.trimMargin()
                }
                // Add successor to worklist if value changed.
                if (!oldValue.isEquivalentTo(newValue)) {
                    worklist.add(succ)
                    nodeValues[succ] = newValue
                }
            }
        }
        return FixpointResult(graph, bottom, nodeValues.filterNot { (_, value) -> value.isBottom })
    }

    private fun nodeTransfer(node: RecipeGraph.Node, input: V) = when (node) {
        is RecipeGraph.Node.Particle -> nodeTransfer(node.particle, input)
        is RecipeGraph.Node.Handle -> nodeTransfer(node.handle, input)
    }

    private fun edgeTransfer(
        source: RecipeGraph.Node,
        target: RecipeGraph.Node,
        edgeKind: RecipeGraph.EdgeKind,
        input: V
    ) = when (edgeKind) {
        is RecipeGraph.EdgeKind.HandleConnection ->
            edgeTransfer(source, target, edgeKind.spec, input)
        is RecipeGraph.EdgeKind.JoinConnection -> {
            require(source is RecipeGraph.Node.Handle)
            require(target is RecipeGraph.Node.Handle)
            edgeTransfer(source.handle, target.handle, edgeKind.spec, input)
        }
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
