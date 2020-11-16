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

  /** Path of [Identifier]s representing access to a handle connection. */
  abstract val path: Path

  /** Association with the current node and child nodes, via the children's Identifier. */
  abstract val associations: Map<Identifier, DependencyNode>

  /** Set of [DependencyNode]s that the current node depends on. */
  abstract val dependency: Set<DependencyNode>

  /** Set of [DependencyNode]s that bear influence on the current node. */
  abstract val influencedBy: Set<DependencyNode>

  /** Gets the [Identifier] of the current node, if present (`null` otherwise). */
  val id: Identifier?
    get() = path.last()

  /** Expresses influence on to the current [DependencyNode]. */
  abstract fun influencedBy(influence: Set<DependencyNode>): DependencyNode

  /** Replace the associations with new mappings. */
  abstract fun add(vararg other: Pair<Identifier, DependencyNode>): DependencyNode

  /** Returns the [DependencyNode] associated with the input [Identifier]. */
  fun lookup(key: Identifier): DependencyNode = requireNotNull(associations[key]) {
    "Identifier '$key' is not found in `associations`."
  }

  /** An unmodified input (from a handle connection) used in a Paxel [Expression]. */
  data class Input private constructor(
    override val path: Path = emptyList(),
    override val dependency: Set<DependencyNode>,
    override val influencedBy: Set<DependencyNode>,
    override val associations: Map<Identifier, DependencyNode>
  ) : DependencyNode() {

    constructor(
      path: Path = emptyList(),
      dependency: Set<DependencyNode> = emptySet(),
      influence: Set<DependencyNode> = emptySet()
    ) : this (path, dependency, influence, emptyMap())

    constructor(
      vararg fields: Identifier,
      dependency: Set<DependencyNode> = emptySet(),
      influence: Set<DependencyNode> = emptySet()
    ) : this(listOf(*fields), dependency, influence)

    constructor(id: Identifier, parent: DependencyNode) : this(parent.path + id) {
      parent.add(id to this)
    }

    /** Replace the associations with new mappings. */
    override fun add(vararg other: Pair<Identifier, DependencyNode>): DependencyNode = copy(
       associations = associations + other
    )

    /** Adds influencing nodes to the `influence` edge set. */
    override fun influencedBy(influence: Set<DependencyNode>) = copy(
      associations = associations.mapValues { (_, node) -> node.influencedBy(influence) },
      influencedBy = influence + influence.flatten()
    )
  }

  /** Represents derivation from a group of [Input]s in an [Expression]. */
  data class DerivedFrom private constructor(
    val inputs: Set<Input> = emptySet(),
    override val associations: Map<Identifier, DependencyNode>,
    override val dependency: Set<DependencyNode>,
    override val influencedBy: Set<DependencyNode>
  ) : DependencyNode() {

    constructor() : this(emptySet(), emptyMap<Identifier, DependencyNode>(), emptySet(), emptySet())

    constructor(vararg paths: Path) :
      this(paths.map { Input(it) }.toSet(), emptyMap(), emptySet(), emptySet())

    /** Produce a new [DerivedFrom] with a flattened set of [Input]s. */
    constructor(
      vararg nodes: DependencyNode,
      associations: Map<Identifier, DependencyNode> = emptyMap(),
      dependency: Set<DependencyNode> = emptySet(),
      influence: Set<DependencyNode> = emptySet()
    ) : this(listOf(*nodes).flatten(), associations, dependency, influence)

    override val path: Path
      get() {
        require(inputs.size == 1) {
          "`path` is not defined on zero or multiple `inputs`."
        }
        return inputs.first().path
      }


    /** Replace the associations with new mappings. */
    override fun add(vararg other: Pair<Identifier, DependencyNode>): DependencyNode = copy(
      associations = associations + other
    )

    /** Extends influence relationships to all contained nodes. */
    override fun influencedBy(influence: Set<DependencyNode>) = copy(
      associations = associations.mapValues { (_, node) -> node.influencedBy(influence) },
      influencedBy = influence + influence.flatten()
    )
  }

  /** Associates [Identifier]s with [DependencyNode]s. */
  data class AssociationNode(
    override val associations: Map<Identifier, DependencyNode> = emptyMap(),
    override val path: Path = emptyList(),
    override val dependency: Set<DependencyNode> = emptySet(),
    override val influencedBy: Set<DependencyNode> = emptySet()
  ) : DependencyNode() {

    /** Construct an [AssociationNode] from associations of [Identifier]s to [DependencyNode]s. */
    constructor(vararg pairs: Pair<Identifier, DependencyNode>) : this(pairs.toMap())

    /** Replace the associations with new mappings. */
    override fun add(vararg other: Pair<Identifier, DependencyNode>): DependencyNode = copy(
      associations = associations + other
    )

    /** Adds [DependencyNode]s that bear influence. */
    fun addInfluence(vararg nodes: DependencyNode) =
      copy(influencedBy = influencedBy + listOf(*nodes).flatten())

    /** Extends influence relationships to all contained nodes. */
    override fun influencedBy(influence: Set<DependencyNode>) = copy(
      associations = associations.mapValues { (_, node) -> node.influencedBy(influence) }
    )
  }

  companion object {
    /** A [DependencyNode] case to represent literals. */
    val LITERAL = DerivedFrom()
  }
}

/** Flattens nested [DependencyNode]s into a set of [DependencyNode.Input]s. */
fun Collection<DependencyNode>.flatten(): Set<DependencyNode.Input> {
  return flatMap { node ->
    when (node) {
      is DependencyNode.Input -> listOf(node)
      is DependencyNode.DerivedFrom -> node.inputs
      is DependencyNode.AssociationNode -> node.associations.values.flatten()
    }
  }.toSet()
}
