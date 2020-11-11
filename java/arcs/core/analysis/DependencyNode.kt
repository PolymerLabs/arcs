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

import arcs.core.data.AccessPath
import arcs.core.data.expression.Expression

/** Field [Identifier]. */
private typealias Identifier = String

/** Lists of [Identifier]s imply an [AccessPath]. */
private typealias Path = List<Identifier>

/**
 * [DependencyNode]s make up a directed-acyclic-graph that describes how input handle connections
 * map to output connections in particle specs with Paxel [Expression]s.
 *
 * - [DependencyNode.Input] represents an input handle connection and access path.
 * - [DependencyNode.DerivedFrom] indicates that an input has been modified in the Paxel expression.
 * - [DependencyNode.AssociationNode] connects fields to other nodes in the graph. These are used to
 *   form left-hand-side / right-hand-side relations between handle connections.
 *
 * Example:
 *   ```
 *   particle HousePets
 *     input: reads PetData { cats: Number, dogs: Number, household: Text }
 *     output: writes PetStats {
 *       ratio: inline Domestication {trained: Number, total: Number},
 *       family: Text,
 *       limit: Number
 *     } = new PetStats {
 *       ratio: new Domestication {
 *         trained: input.cats,
 *         total: input.cats + input.dogs,
 *       },
 *       family: input.household,
 *       limit: 5
 *     }
 *   ```
 *
 *   This can be translated to:
 *
 *   ```
 *   DependencyNode.AssociationNode(
 *    "ratio" to DependencyNode.AssociationNode(
 *      "trained" to DependencyNode.Input("input", "cats"),
 *      "total" to DependencyNode.DerivedFrom(
 *        DependencyNode.Input("input", "cats"),
 *        DependencyNode.Input("input", "dogs")
 *      )
 *    ),
 *    "family" to DependencyNode.Input("input", "household"),
 *    "limit" to DependencyNode.LITERAL
 *   )
 *   ```
 *
 *   We can represent this DAG graphically:
 *
 *                    (root)
 *            __________|______
 *           /      |          \
 *          /      /        _(ratio)_
 *        /       /        |         \
 *   (limit)  (family)  (trained)  (total)
 *     |        |          |     /   |
 *     |        |          |   /     |
 *     x     (household)  (cats)  (dogs)
 *
 *   This internal representation, in turn, can be translated into the following claims:
 *
 *   ```
 *   claim output.ratio.trained derives from input.cats
 *   claim output.ratio.total derives from input.cats and derives from input.dogs
 *   claim output.family derives from input.household
 *   ```
 */
sealed class DependencyNode {

  abstract fun influencedBy(influence: Set<DependencyNode>): DependencyNode

  abstract class Nodelike : DependencyNode() {
    abstract val accessPath: Path
    abstract val dependency: Set<Nodelike>
    abstract val influence: Set<Nodelike>

    val id: Identifier?
      get() = accessPath.last()

    fun dependencyOrDefault(default: DependencyNode): DependencyNode = when (dependency.size) {
      0 -> default
      1 -> dependency.first()
      else -> Nodes(dependency.toList())
    }
  }

  data class Node(
    override val accessPath: Path,
    override val dependency: Set<Nodelike> = emptySet(),
    override val influence: Set<Nodelike> = emptySet()
  ) : Nodelike() {
    constructor(
      vararg paths: Identifier,
      dependency: Set<Nodelike> = emptySet(),
      influence: Set<Nodelike> = emptySet()
    ) : this(listOf(*paths), dependency, influence)

    constructor(
      id: Identifier,
      parent: Nodelike
    ) : this(parent.accessPath + id)

    override fun influencedBy(influence: Set<DependencyNode>) =
      copy(influence = this.influence + (influence as Set<Nodelike>))
  }

  data class DerivedNode(
    override val accessPath: Path,
    override val dependency: Set<Nodelike> = emptySet(),
    override val influence: Set<Nodelike> = emptySet()
  ) : Nodelike() {

    constructor(
      vararg paths: Identifier,
      dependency: Set<Nodelike> = emptySet(),
      influence: Set<Nodelike> = emptySet()
    ) : this(listOf(*paths), dependency, influence)

    constructor(
      id: Identifier,
      parent: Nodelike
    ) : this(parent.accessPath + id)

    override fun influencedBy(influence: Set<DependencyNode>) =
      copy(influence = this.influence + (influence as Set<Nodelike>))
  }

  data class Nodes private constructor(
    val nodes: Set<Nodelike> = emptySet()
  ) : DependencyNode() {
    constructor() : this(emptySet())
    constructor(vararg nodes: DependencyNode) : this(flatten(listOf(*nodes)))
    constructor(nodes: List<Nodelike>) : this(nodes.toSet())

    /** Converts a list of node pairs into a dependency relationship. */
    constructor(vararg edges: Pair<Identifier, DependencyNode>) :
      this(edges.groupBy({ it.first }, { it.second }).map { (id, node) ->
        Node(id, dependency = flatten(node))
      })

    override fun influencedBy(influence: Set<DependencyNode>) = copy(
      nodes.map { it.influencedBy(influence) as Nodelike }.toSet()
    )

    companion object {
      internal fun flatten(nodes: List<DependencyNode>): Set<Nodelike> {
        return nodes.flatMap { node ->
          when (node) {
            is Nodes -> node.nodes
            is Node -> listOf(node)
            is DerivedNode -> listOf(node)
            else -> throw UnsupportedOperationException("Nodes can only contain terminal nodes.")
          }
        }.toSet()
      }
    }
  }

  data class BufferedScope(
    val ctx: Map<Identifier, DependencyNode> = emptyMap(),
    val influence: Set<Nodelike> = emptySet()
  ) : DependencyNode() {

    fun add(vararg associations: Pair<Identifier, DependencyNode>) = copy(ctx + associations)

    operator fun get(key: Identifier): DependencyNode? = ctx[key]

    fun addInfluence(vararg nodes: DependencyNode) =
      copy(influence = influence + Nodes.flatten(listOf(*nodes)))

    override fun influencedBy(influence: Set<DependencyNode>) =
      copy(ctx = ctx.mapValues { (_, node) -> node.influencedBy(influence) })
  }

  companion object {
    /** A [DependencyNode] case to represent literals. */
    val LITERAL = Nodes()
  }
}

fun DependencyNode.modified(): DependencyNode {
  return when (this) {
    is DependencyNode.Nodelike -> DependencyNode.DerivedNode(accessPath, dependency, influence)
    is DependencyNode.Nodes -> DependencyNode.Nodes(
      nodes.map { it.modified() as DependencyNode.Nodelike }
    )
    is DependencyNode.BufferedScope -> copy(ctx.mapValues { it.value.modified() })
  }
}
