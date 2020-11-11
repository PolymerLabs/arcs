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
 * Each [DependencyNode.Terminal] node contains two types of edges: `dependency`, which indicates
 * that the current node depends one or more additional nodes, and `influence`, which is used to
 * express indirect affects on the output expression (namely, from filters).
 *
 * Terminal nodes include:
 * - [DependencyNode.Equal] represents an unmodified input handle connection and access path.
 * - [DependencyNode.Derived] indicates that an input has been modified in the Paxel expression.
 *
 * Non-terminal nodes consist of:
 * - [DependencyNode.Nodes] represent a collection of [DependencyNode.Terminal] nodes.
 * - [DependencyNode.BufferedScope] contains associations between [Identifier]s and
 *   [DependencyNode]s as well as a set of "influence" nodes.
 */
sealed class DependencyNode {

  /** Express influence from a set of nodes on to the current [DependencyNode]. */
  abstract fun influencedBy(influence: Set<DependencyNode>): DependencyNode

  /** Abstract notion of an access path and dependency relationships. */
  abstract class Terminal : DependencyNode() {
    abstract val accessPath: Path
    abstract val dependency: Set<Terminal>
    abstract val influence: Set<Terminal>

    val id: Identifier?
      get() = accessPath.last()

    fun dependencyOrDefault(default: DependencyNode): DependencyNode = when (dependency.size) {
      0 -> default
      1 -> dependency.first()
      else -> Nodes(dependency.toList())
    }
  }

  /** A [Terminal] with input that has been unmodified by the expression. */
  data class Equal(
    override val accessPath: Path,
    override val dependency: Set<Terminal>,
    override val influence: Set<Terminal>
  ) : Terminal() {
    constructor(
      vararg paths: Identifier,
      dependency: Set<Terminal> = emptySet(),
      influence: Set<Terminal> = emptySet()
    ) : this(listOf(*paths), dependency, influence)

    constructor(id: Identifier, parent: Terminal) :
      this(parent.accessPath + id, emptySet(), emptySet())

    override fun influencedBy(influence: Set<DependencyNode>) =
      copy(influence = this.influence + influence.flatten())
  }

  /** A [Terminal] with input that has been modified by the expression. */
  data class Derived(
    override val accessPath: Path,
    override val dependency: Set<Terminal>,
    override val influence: Set<Terminal>
  ) : Terminal() {
    constructor(
      vararg paths: Identifier,
      dependency: Set<Terminal> = emptySet(),
      influence: Set<Terminal> = emptySet()
    ) : this(listOf(*paths), dependency, influence)

    constructor(id: Identifier, parent: Terminal) :
      this(parent.accessPath + id, emptySet(), emptySet())

    override fun influencedBy(influence: Set<DependencyNode>) =
      copy(influence = this.influence + influence.flatten())
  }

  /** A collection of [Terminal] nodes. */
  data class Nodes private constructor(
    val nodes: Set<Terminal> = emptySet()
  ) : DependencyNode() {
    constructor() : this(emptySet())
    constructor(nodes: List<Terminal>) : this(nodes.toSet())

    /** Converts [DependencyNode]s into a flattened collection of [Terminal] nodes. */
    constructor(vararg nodes: DependencyNode) : this(listOf(*nodes).flatten())

    /** Converts a list of node pairs into `dependency` relationships. */
    constructor(vararg edges: Pair<Identifier, DependencyNode>) :
      this(edges.groupBy({ it.first }, { it.second }).map { (id, node) ->
        Equal(id, dependency = node.flatten())
      })

    override fun influencedBy(influence: Set<DependencyNode>) = copy(
      nodes = nodes.map { it.influencedBy(influence) as Terminal }.toSet()
    )
  }

  /**
   * Associates [Identifier]s with [DependencyNode] and holds a buffer used to express `influence`.
   */
  data class BufferedScope(
    val ctx: Map<Identifier, DependencyNode> = emptyMap(),
    val influence: Set<Terminal> = emptySet()
  ) : DependencyNode() {

    /** Add associations to the scope. */
    fun add(vararg associations: Pair<Identifier, DependencyNode>) = copy(ctx = ctx + associations)

    /** Returns the [DependencyNode]s associated with the input [Identifier], or `null`. */
    operator fun get(key: Identifier): DependencyNode? = ctx[key]

    /** Add [DependencyNode] that bear influence into the buffer. */
    fun addInfluence(vararg nodes: DependencyNode) =
      copy(influence = influence + listOf(*nodes).flatten())

    override fun influencedBy(influence: Set<DependencyNode>) =
      copy(ctx = ctx.mapValues { (_, node) -> node.influencedBy(influence) })
  }

  companion object {
    /** A [DependencyNode] case to represent literals. */
    val LITERAL = Nodes()
  }
}

/** Flatten nested [DependencyNode] into a set of [DependencyNode.Terminal]s. */
fun Collection<DependencyNode>.flatten(): Set<DependencyNode.Terminal> {
  return flatMap { node ->
    when (node) {
      is DependencyNode.Terminal -> listOf(node)
      is DependencyNode.Nodes -> node.nodes
      is DependencyNode.BufferedScope -> node.ctx.values.flatten()
    }
  }.toSet()
}

/** Convert all nested [DependencyNode.Equal] nodes into [DependencyNode.Derived]. */
fun DependencyNode.modified(): DependencyNode {
  return when (this) {
    is DependencyNode.Terminal -> DependencyNode.Derived(accessPath, dependency, influence)
    is DependencyNode.Nodes -> DependencyNode.Nodes(
      nodes.map { it.modified() as DependencyNode.Terminal }
    )
    is DependencyNode.BufferedScope -> copy(ctx = ctx.mapValues { it.value.modified() })
  }
}
