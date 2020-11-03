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

import arcs.core.common.Id
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
 * - [DependencyNode.Equals] is an [Input] that has been unmodified by the expression.
 * - [DependencyNode.DerivedFrom] indicates an [Input] has been modified in the expression.
 * - [DependencyNode.InfluencedBy] is used to express influence from a filter expression.
 * - [DependencyNode.Nodes] gathers other [DependencyNode]s into a collection (without duplicates).
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
 *      "trained" to DependencyNode.Equals("input", "cats"),
 *      "total" to DependencyNode.Nodes(
 *        DependencyNode.DerivedFrom("input", "cats"),
 *        DependencyNode.DerivedFrom("input", "dogs")
 *      )
 *    ),
 *    "family" to DependencyNode.Equals("input", "household"),
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

  /** An input from a handle connection used in an [Expression]. */
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

    override fun toString(): String = "Input(path=${path.toString()}, edge=$edge)"
  }

  /** A case to represent literals in [Expression]s. */
  class Literal(val value: String) : Input(emptyList(), EdgeType.LITERAL) {
    override fun toString() = "Literal($value)"
  }

  /** Represents [Input]s that are unmodified. */
  data class Equals(override val path: Path) : Input(path, EdgeType.EQUALS) {
    constructor(vararg path: Identifier) : this(listOf(*path))
  }

  /** Represents [Input]s that have been modified by a variable or literal. */
  data class DerivedFrom(override val path: Path): Input(path, EdgeType.DERIVED_FROM) {
    constructor(vararg path: Identifier) : this(listOf(*path))
  }

  /** Represents [Input]s that have been influenced by a filter expression. */
  data class InfluencedBy(override val path: Path): Input(path, EdgeType.INFLUENCED_BY) {
    constructor(vararg path: Identifier) : this(listOf(*path))
  }

  /** A collection of [DependencyNode]s. */
  data class Nodes private constructor(
    val nodes: Set<DependencyNode> = emptySet()
  ) : DependencyNode() {
    constructor(vararg nodes: DependencyNode) : this(flatten(listOf(*nodes)))
    constructor(nodes: List<DependencyNode>) : this(flatten(nodes))

    companion object {
      private fun flatten(nodes: List<DependencyNode>): Set<DependencyNode> =
        nodes.flatMap { node -> if (node is Nodes) node.nodes else listOf(node) }.toSet()
    }

    fun add(vararg others: DependencyNode) = Nodes(nodes.toList() + others)

    fun concat(other: Nodes) = Nodes(nodes + other.nodes)

    fun isEmpty() = nodes.isEmpty()

    fun isNotEmpty() = !isEmpty()
  }

  data class BufferedScope(
    val context: AssociationNode = AssociationNode(),
    val buffer: Nodes = Nodes()
  ) : DependencyNode() {

    fun add(vararg other: Pair<Identifier, DependencyNode>) = copy(context = context.add(*other))

    fun addInfluence(others: Nodes) = copy(buffer = buffer.concat(others))

    fun lookupOrNull(key: Identifier): DependencyNode? = context.lookupOrNull(key)
  }

  /** Associates [Identifier]s with [DependencyNode]s. */
  data class AssociationNode internal constructor(
    val associations: List<Pair<Identifier, DependencyNode>> = emptyList()
  ) : DependencyNode() {

    /** Construct an [AssociationNode] from associations of [Identifier]s to [DependencyNode]s. */
    constructor(vararg pairs: Pair<Identifier, DependencyNode>) : this(flatten(*pairs))

    /** Add associations of an [AssociationNode] with new mappings. */
    fun add(vararg other: Pair<Identifier, DependencyNode>) =
      AssociationNode(associations + flatten(*other))

    /** Returns the [DependencyNode]s associated with the input [Identifier], or `null`. */
    fun lookupOrNull(key: Identifier): DependencyNode? {
      val target = associations.filter { it.first == key }.map { it.second }
      return when(target.size) {
        0 -> null
        1 -> target.first()
        else -> Nodes(*target.toTypedArray())
      }
    }

    companion object {
      private fun flatten(
        vararg pairs: Pair<Identifier, DependencyNode>
      ): List<Pair<Identifier, DependencyNode>> {
        return pairs.flatMap { (identifier, node) ->
          if (node is Nodes) node.nodes.map { identifier to it }
          else listOf(identifier to node)
        }
      }
    }
  }

  companion object {
    /** A common [Literal] node. */
    val LITERAL = Literal("unknown")
  }
}
