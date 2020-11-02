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

  enum class EdgeType {
    LITERAL, EQUALS, DERIVED_FROM, INFLUENCED_BY
  }

  /** An unmodified input (from a handle connection) used in a Paxel [Expression]. */
  open class Input(open val path: Path = emptyList(), val edge: EdgeType) : DependencyNode() {
    override fun equals(other: Any?): Boolean {
      if (this === other) return true
      if (other !is Input) return false

      if (path != other.path) return false
      if (edge != other.edge) return false

      return true
    }

    override fun hashCode(): Int {
      var result = path.hashCode()
      result = 31 * result + edge.hashCode()
      return result
    }
  }

  class Literal : Input(emptyList(), EdgeType.LITERAL)

  data class Equals(override val path: Path) : Input(path, EdgeType.EQUALS) {
    constructor(vararg path: Identifier) : this(listOf(*path))
  }

  data class DerivedFrom(override val path: Path): Input(path, EdgeType.DERIVED_FROM) {
    constructor(vararg path: Identifier) : this(listOf(*path))
  }

  data class InfluencedBy(override val path: Path): Input(path, EdgeType.INFLUENCED_BY) {
    constructor(vararg path: Identifier) : this(listOf(*path))
  }

  data class Nodes internal constructor(
    val nodes: Set<DependencyNode> = emptySet()
  ) : DependencyNode() {
    constructor(vararg nodes: DependencyNode) : this(flatten(*nodes))

    companion object {
      fun flatten(vararg nodes: DependencyNode): Set<DependencyNode> =
        nodes.flatMap { node -> if (node is Nodes) node.nodes else listOf(node) }.toSet()
    }
  }

  /** Associates [Identifier]s with [DependencyNode]s. */
  data class AssociationNode(
    val associations: List<Pair<Identifier, DependencyNode>> = emptyList()
  ) : DependencyNode() {

    /** Construct an [AssociationNode] from associations of [Identifier]s to [DependencyNode]s. */
    constructor(vararg pairs: Pair<Identifier, DependencyNode>) : this(listOf(*pairs))

    /** Add associations of an [AssociationNode] with new mappings. */
    fun add(vararg other: Pair<Identifier, DependencyNode>): DependencyNode = AssociationNode(
      associations + other
    )

    /** Returns the [DependencyNode]s associated with the input [Identifier]. */
    fun lookupOrNull(key: Identifier): DependencyNode? {
      val target = associations.filter { it.first == key }.map { it.second }.toSet()
      return when(target.size) {
        0 -> null
        1 -> target.first()
        else -> Nodes(target)
      }
    }
  }

  companion object {
    /** A [DependencyNode] case to represent literals. */
    val LITERAL = Literal()
  }
}
