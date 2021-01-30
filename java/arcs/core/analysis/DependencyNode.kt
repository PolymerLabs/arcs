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
 * map to output connections in particle specs with [Expression]s.
 *
 * - [DependencyNode.Input] represents an input handle connection and access path.
 * - [DependencyNode.Derived] indicates that an input has been modified in the expression.
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
 *      "total" to DependencyNode.Derived(
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

  /** Set of [DependencyNode]s that the current node depends on. */
  abstract val dependency: Set<DependencyNode>

  /** Set of [DependencyNode]s that bear influence on the current node. */
  abstract val influencedBy: Set<DependencyNode>

  /** Expresses influence on to the current [DependencyNode]. */
  abstract fun influence(influenceBy: Set<DependencyNode>): DependencyNode

  /** Associates [Identifier]s with [DependencyNode]s. */
  open class AssociationNode(
    override val path: Path = emptyList(),
    override val dependency: Set<DependencyNode> = emptySet(),
    override val influencedBy: Set<DependencyNode> = emptySet(),
    val associations: Map<String, DependencyNode>
  ) : DependencyNode() {

    /** Constructor to express associations. */
    constructor(
      vararg mappings: Pair<Identifier, DependencyNode>,
      path: Path = emptyList(),
      dependency: Set<DependencyNode> = emptySet(),
      influencedBy: Set<DependencyNode> = emptySet()
    ) : this(path, dependency, influencedBy, mappings.toMap())

    /** Expresses influence on to the current [DependencyNode]. */
    override fun influence(influenceBy: Set<DependencyNode>): DependencyNode = AssociationNode(
      path,
      dependency,
      this.influencedBy + influenceBy,
      associations.mapValues { (_, node) -> node.influence(influencedBy) }
    )

    /** Replace the associations of an [AssociationNode] with new mappings. */
    fun add(vararg other: Pair<Identifier, DependencyNode>): AssociationNode = AssociationNode(
      path,
      dependency,
      influencedBy,
      associations + other
    )

    /** Returns the [DependencyNode] associated with the input [Identifier]. */
    operator fun get(key: Identifier): DependencyNode? = associations[key]

    override fun equals(other: Any?): Boolean {
      if (this === other) return true
      if (other !is AssociationNode) return false

      if (path != other.path) return false
      if (dependency != other.dependency) return false
      if (influencedBy != other.influencedBy) return false
      if (associations != other.associations) return false

      return true
    }

    override fun hashCode(): Int {
      var result = path.hashCode()
      result = 31 * result + dependency.hashCode()
      result = 31 * result + influencedBy.hashCode()
      result = 31 * result + associations.hashCode()
      return result
    }

    override fun toString(): String {
      return "AssociationNode(path=$path, dependency=$dependency, influencedBy=$influencedBy," +
        " associations=$associations)"
    }
  }

  /** An unmodified input (from a handle connection) used in a [Expression]. */
  class Input(
    override val path: Path,
    override val dependency: Set<DependencyNode> = emptySet(),
    override val influencedBy: Set<DependencyNode> = emptySet()
  ) : AssociationNode(path, dependency, influencedBy, emptyMap()) {

    /** Constructor to build input [Path]s. */
    constructor(
      vararg identifier: Identifier,
      dependency: Set<DependencyNode> = emptySet(),
      influencedBy: Set<DependencyNode> = emptySet()
    ) : this(listOf(*identifier), dependency, influencedBy)

    override fun toString(): String {
      return "Input(path=$path, dependency=$dependency, influencedBy=$influencedBy)"
    }
  }

  /** Represents derivation from a group of [Input]s in an [Expression]. */
  data class Derived(
    override val path: Path,
    override val dependency: Set<DependencyNode> = emptySet(),
    override val influencedBy: Set<DependencyNode> = emptySet(),
    val inputs: Set<DependencyNode>
  ) : DependencyNode() {

    /** Constructor for Literals. */
    constructor() : this(emptyList(), emptySet(), emptySet(), emptySet())

    /** Constructor to express derivation of [Input]s. */
    constructor(
      vararg inputs: DependencyNode,
      path: Path = emptyList(),
      dependency: Set<DependencyNode> = emptySet(),
      influencedBy: Set<DependencyNode> = emptySet()
    ) : this(
      path,
      dependency,
      influencedBy,
      setOf(*inputs).flatten()
    )

    /** Expresses influence on to the current [DependencyNode]. */
    override fun influence(influenceBy: Set<DependencyNode>): DependencyNode = Derived(
      path,
      dependency,
      this.influencedBy + influenceBy,
      inputs.map { node -> node.influence(influencedBy) }.toSet()
    )
  }

  companion object {
    val LITERAL = Derived()
  }
}

/** Flatten a collection of nested [DependencyNode]s. */
fun Collection<DependencyNode>.flatten(): Set<DependencyNode> {
  return this.flatMap { node ->
    when (node) {
      is DependencyNode.AssociationNode -> setOf(node) + node.associations.values.flatten()
      is DependencyNode.Derived -> node.inputs
    }
  }.toSet()
}
