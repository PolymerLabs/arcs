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
import arcs.core.data.HandleMode
import arcs.core.data.Recipe

/**
 * A graph capturing the connections between particles and handles in [recipe].
 *
 * Nodes in the graph are either a [Recipe.Handle] or [Recipe.Particle]. For every write connection
 * from a particle `p` to a handle `h` using a connection spec `s`, there is a labeled edge
 * `p -s-> h` in the graph. Similarly, for every read connection from a particle `p` to a handle `h`
 * using a connection spec `s`, there is a labeled edge `h -s-> p` in the graph.
*/
class RecipeGraph(recipe: Recipe) {
    val nodes: List<Node> = getNodesWithEdges(recipe)

    /** Returns the nodes for the [Recipe.Handle] and [Recipe.Particle] instances in [recipe]. */
    private fun getNodesWithEdges(recipe: Recipe): List<Node> {
        val handleNodesMap: Map<String, Node> = recipe.handles
            .map { (_, handle) -> Node.Handle(handle) }
            .associateBy { it.handle.name }
        return handleNodesMap.values.toList() + recipe.particles.map { it.getNode(handleNodesMap) }
    }

    /** Returns a [Node.Particle] node with the edges associated with the handle connections. */
    private fun Recipe.Particle.getNode(handleNodesMap: Map<String, Node>): Node {
        val particleNode = Node.Particle(this)
        handleConnections.forEach { connection ->
            val handleNode = requireNotNull(handleNodesMap[connection.handle.name])
            when (connection.spec.direction) {
                HandleMode.Read, HandleMode.ReadQuery, HandleMode.Query ->
                    handleNode.addSuccessor(particleNode, connection.spec)
                HandleMode.Write, HandleMode.WriteQuery ->
                    particleNode.addSuccessor(handleNode, connection.spec)
                HandleMode.ReadWrite, HandleMode.ReadWriteQuery -> {
                    handleNode.addSuccessor(particleNode, connection.spec)
                    particleNode.addSuccessor(handleNode, connection.spec)
                }
            }
        }
        return particleNode
    }

    /** Represents a node in a [RecipeGraph]. */
    sealed class Node {
        /** List of successors of this node. */
        val successors: List<Neighbor>
            get() = _successors

        /** List of predecessors of this node. */
        val predecessors: List<Neighbor>
            get() = _predecessors

        /** (Internal) list of successors of this node. */
        private val _successors = mutableListOf<Neighbor>()

        /** (Internal) list of predecessors of this node. */
        private val _predecessors = mutableListOf<Neighbor>()

        /** Adds ([succ], [spec]) as a successor of [this] and also updates [succ.predecessors]. */
        fun addSuccessor(succ: Node, spec: HandleConnectionSpec) {
            _successors.add(Neighbor(succ, spec))
            succ._predecessors.add(Neighbor(this, spec))
        }

        /** Represents a successor or predecessor of a [Node] in a [RecipeGraph]. */
        data class Neighbor(val node: Node, val spec: HandleConnectionSpec)

        /** A node representing a particle. */
        data class Particle(val particle: Recipe.Particle) : Node() {
            override fun toString() = "[p:${particle.spec.name}]"
        }

        /** A node representing a handle. */
        data class Handle(val handle: Recipe.Handle) : Node() {
            override fun toString() = "[h:${handle.name}]"
        }
    }
}
