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

import arcs.core.data.Check
import arcs.core.data.Claim
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.Recipe

/**
 * A graph capturing the connections between particles and handles in a [Recipe].
 *
 * Nodes in the graph are either a [Recipe.Handle] or [Recipe.Particle]. For every write connection
 * from a particle `p` to a handle `h` using a connection spec `s`, there is a labeled edge
 * `p -s-> h` in the graph. Similarly, for every read connection from a particle `p` to a handle `h`
 * using a connection spec `s`, there is a labeled edge `h -s-> p` in the graph.
*/
data class RecipeGraph(
    val particleNodes: List<Node.Particle>,
    val handleNodes: List<Node.Handle>
) {
    val nodes: List<Node> = particleNodes + handleNodes

    /**
     * A class representing the properties of a join.
     *
     * This is a dummy class for the time being, but will have more information when the support
     * for join is fully flshed out. This should also move out of this file. */
    data class JoinSpec(val component: Int, val type: String = "INNER")

    /** Represents an edge kind. */
    sealed class EdgeKind {
        /** A handle connection edge between particle and handle. */
        data class HandleConnection(val spec: HandleConnectionSpec) : EdgeKind()

        /**
         * A join connection edges between two handles.
         *
         * The [spec] just a dummy state for the time being. When the support for join is fully
         * fleshed out, this would consist of things like refinements, etc.
         */
        data class JoinConnection(val spec: JoinSpec) : EdgeKind()
    }

    /** Represents a node in a [RecipeGraph]. */
    sealed class Node {
        /** Name for the node, used in debug logs. */
        abstract val debugName: String

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

        /** Adds ([succ], [joinSpec]) as a successor of [this] and updates [succ.predecessors]. */
        fun addSuccessor(succ: Node, joinSpec: JoinSpec) {
            _successors.add(Neighbor(succ, joinSpec))
            succ._predecessors.add(Neighbor(this, joinSpec))
        }

        /** Adds ([succ], [spec]) as a successor of [this] and also updates [succ.predecessors]. */
        fun addSuccessor(succ: Node, spec: HandleConnectionSpec) {
            _successors.add(Neighbor(succ, spec))
            succ._predecessors.add(Neighbor(this, spec))
        }

        /** Represents a successor or predecessor of a [Node] in a [RecipeGraph]. */
        data class Neighbor(val node: Node, val kind: EdgeKind) {
            /** A handle connection neighbor. */
            constructor(node: Node, spec: HandleConnectionSpec) :
                this(node, EdgeKind.HandleConnection(spec))

            /** A join connection neighbor. */
            constructor(node: Node, spec: JoinSpec) :
                this(node, EdgeKind.JoinConnection(spec))
        }

        /** A node representing a particle. */
        data class Particle(
            val particle: Recipe.Particle,
            val claims: List<Claim>,
            val checks: List<Check>
        ) : Node() {
            constructor(particle: Recipe.Particle) : this(
                particle,
                particle.spec.claims,
                particle.spec.checks
            )

            val particleName = particle.spec.name

            override val debugName = "p:$particleName"

            override fun toString() = "[$debugName]"
        }

        /** A node representing a handle. */
        data class Handle(val handle: Recipe.Handle) : Node() {
            override val debugName = "h:${handle.name}"

            override fun toString() = "[$debugName]"
        }
    }

    companion object {
        /** Factory method to convert a [Recipe] into a [RecipeGraph]. */
        operator fun invoke(recipe: Recipe): RecipeGraph {
            val handleNodesMap = recipe.handles.mapValues { (_, handle) -> Node.Handle(handle) }
            val handleNodes = handleNodesMap.values.toList()
            handleNodes.forEach { it.addJoinEdges(handleNodesMap) }
            val particleNodes = recipe.particles.map { it.getNode(handleNodesMap) as Node.Particle }
            return RecipeGraph(particleNodes, handleNodes)
        }

        /**
         * Adds edges between handles due to the JOINs.
         *
         * eg., if the recipe has `joined: join(a, b)`, we will have the following edges:
         *    { a -> [joined], b -> [joined] }
         */
        private fun Node.Handle.addJoinEdges(handleNodesMap: Map<String, Node.Handle>) {
            if (handle.fate != Recipe.Handle.Fate.JOIN) return
            handle.associatedHandles.forEachIndexed { index, targetHandle ->
                val joinHandleNode = requireNotNull(handleNodesMap[targetHandle.name])
                joinHandleNode.addSuccessor(this, JoinSpec(index))
            }
        }

        /**
         * Returns a [Node.Particle] node with the edges associated with the handle connections.
         */
        private fun Recipe.Particle.getNode(handleNodesMap: Map<String, Node.Handle>): Node {
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
    }
}
