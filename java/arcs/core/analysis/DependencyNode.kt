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

  /** An unmodified input (from a handle connection) used in a Paxel [Expression]. */
  data class Input(val path: Path = emptyList()) : DependencyNode() {
    constructor(vararg fields: Identifier) : this(listOf(*fields))
  }

  /** Represents derivation from a group of [Input]s in an [Expression]. */
  data class DerivedFrom(val inputs: Set<Input> = emptySet()) : DependencyNode() {

    constructor(vararg paths: Path) : this(paths.map { Input(it) }.toSet())

    /** Produce a new [DerivedFrom] with a flattened set of [Input]s. */
    constructor(vararg nodes: DependencyNode) : this(flatten(*nodes))

    companion object {
      /** Flatten nested sets of [DependencyNode]s.*/
      private fun flatten(vararg nodes: DependencyNode): Set<Input> {
        return nodes.flatMap { node ->
          when (node) {
            is Input -> setOf(node)
            is DerivedFrom -> node.inputs
            else -> throw IllegalArgumentException(
              "Nodes must be a 'Input' or 'DerivedFrom'."
            )
          }
        }.toSet()
      }
    }
  }

  /** Associates [Identifier]s with [DependencyNode]s. */
  data class AssociationNode(
    val associations: Map<Identifier, DependencyNode> = emptyMap()
  ) : DependencyNode() {

    /** Construct an [AssociationNode] from associations of [Identifier]s to [DependencyNode]s. */
    constructor(vararg pairs: Pair<Identifier, DependencyNode>) : this(pairs.toMap())

    /** Replace the associations of an [AssociationNode] with new mappings. */
    fun add(vararg other: Pair<Identifier, DependencyNode>): DependencyNode = AssociationNode(
      associations + other
    )

    /** Returns the [DependencyNode] associated with the input [Identifier]. */
    fun lookup(key: Identifier): DependencyNode = requireNotNull(associations[key]) {
      "Identifier '$key' is not found in AssociationNode."
    }

    /** Returns the [DependencyNode] associated with the input [Identifier], or `null`. */
    fun lookupOrNull(key: Identifier): DependencyNode? = associations[key]
  }

  companion object {
    /** A [DependencyNode] case to represent literals. */
    val LITERAL = DerivedFrom()

    /** A special key used to store side-effectual [DependencyNode]s in an [AssociationNode]. */
    val INFLUENCE_KEY = "_influence_"
  }
}
