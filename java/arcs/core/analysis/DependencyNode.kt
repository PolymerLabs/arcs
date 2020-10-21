package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.expression.Expression

/** Field [Identifier]. */
private typealias Identifier = String

/** Lists of [Identifier]s imply an [AccessPath]. */
private typealias Path = List<Identifier>

/**
 * [DependencyNode]s represent how inputs of a Paxel [Expression] contribute to its outputs.
 *
 * A [DependencyNode] makes up a Directed-Acyclic-Graph to map fields of an output handle
 * connection to fields in other handle connections.
 *
 * - [DependencyNode.PrimitiveValue] represents an input handle connection and access path.
 * - [DependencyNode.DerivedFrom] indicates that an input has been modified in the Paxel expression.
 * - [DependencyNode.AggregateValue] connects partial access paths to other nodes in the graph.
 *   These are used to form left-hand-side / right-hand-side relations between handle connections.
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
 *   DependencyNode.AggregateValue(
 *    "ratio" to DependencyNode.AggregateValue(
 *      "trained" to DependencyNode.PrimitiveValue("input", "cats"),
 *      "total" to DependencyNode.DerivedFrom(
 *        DependencyNode.PrimitiveValue("input", "cats"),
 *        DependencyNode.PrimitiveValue("input", "dogs")
 *      )
 *    ),
 *    "family" to DependencyNode.PrimitiveValue("input", "household"),
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
  data class PrimitiveValue(val path: Path = emptyList()) : DependencyNode() {
    constructor(vararg fields: Identifier) : this(listOf(*fields))
  }

  /** Represents modification of an access path within a Paxel [Expression]. */
  data class DerivedFrom(val inputs: Set<DependencyNode> = emptySet()) : DependencyNode() {

    constructor() : this(emptySet())

    constructor(vararg paths: Path) : this(paths.map { PrimitiveValue(it) }.toSet())

    constructor(vararg nodes: DependencyNode) : this(flatten(*nodes))

    companion object {
      /** Flatten nested sets of [DependencyNode]s.*/
      private fun flatten(vararg nodes: DependencyNode): Set<DependencyNode> {
        return nodes.flatMap { node ->
          when (node) {
            is PrimitiveValue -> setOf(node)
            is DerivedFrom -> node.inputs
            else -> throw IllegalArgumentException(
              "Nodes must be a 'PrimitiveValue' or 'DerivedFrom'."
            )
          }
        }.toSet()
      }
    }
  }

  /** Associates [Identifier]s with [DependencyNode]s. */
  data class AggregateValue(
    val associations: Map<Identifier, DependencyNode> = emptyMap()
  ) : DependencyNode() {

    constructor(vararg pairs: Pair<Identifier, DependencyNode>) : this(pairs.toMap())

    /** Extend the associations of an [AggregateValue] with new mappings. */
    fun add(vararg other: Pair<Identifier, DependencyNode>): DependencyNode = AggregateValue(
      associations + other
    )

    /** Returns the [DependencyNode] associated with the input [Identifier]. */
    fun lookup(key: Identifier): DependencyNode = requireNotNull(associations[key]) {
      "Identifier '$key' is not found in AggregateValue."
    }
  }

  companion object {
    /** A [DependencyNode] case to represent literals. */
    val LITERAL = DerivedFrom()
  }
}
