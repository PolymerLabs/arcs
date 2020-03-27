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

/** Constructs a graph capturing the connections between particles and handles in [recipe]. */
class RecipeGraph(recipe: Recipe) {
    var nodes = mutableListOf<Node>()

    init {
        val handleNodesMap: Map<String, Node> = recipe.handles
            .map { (_, handle) -> Node.Handle(handle) }
            .associateBy { it.handle.name }
        nodes = handleNodesMap.values.toMutableList()
        recipe.particles.forEach { it.addNodeAndEdges(handleNodesMap) }
    }

    /** Adds a [Node.Particle] node and the edges induced by the handle connections. */
    private fun Recipe.Particle.addNodeAndEdges(handleNodesMap: Map<String, Node>) {
        val particleNode = Node.Particle(this)
        nodes.add(particleNode)
        handleConnections.forEach { connection ->
            val handleNode = requireNotNull(handleNodesMap[connection.handle.name])
            when (connection.spec.direction) {
                HandleMode.Read -> handleNode.addSuccessor(particleNode, connection.spec)
                HandleMode.Write -> particleNode.addSuccessor(handleNode, connection.spec)
                HandleMode.ReadWrite -> {
                    handleNode.addSuccessor(particleNode, connection.spec)
                    particleNode.addSuccessor(handleNode, connection.spec)
                }
            }
        }
    }

    /** Represents a node in a [RecipeGraph]. */
    sealed class Node {
        /** List of successors of this node. */
        val successors = mutableListOf<Neighbor>()

        /** List of predecessors of this node. */
        val predecessors = mutableListOf<Neighbor>()

        /** Adds ([succ], [spec]) as a successor of [this] and also updates [succ.predecessors]. */
        fun addSuccessor(succ: Node, spec: HandleConnectionSpec) {
            successors.add(Neighbor(succ, spec))
            succ.predecessors.add(Neighbor(this, spec))
        }

        /** Represents a successor or predecessor of a [Node] in a [RecipeGraph]. */
        data class Neighbor(val node: Node, val spec: HandleConnectionSpec)

        /** A node representing a particle. */
        data class Particle(val particle: Recipe.Particle) : Node()

        /** A node representing a handle. */
        data class Handle(val handle: Recipe.Handle) : Node()
    }
}
