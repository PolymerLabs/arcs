package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.expression.Expression

/** Field [Identifier]. */
private typealias Identifier = String

/** Lists of [Identifier]s imply an [AccessPath]. */
private typealias Path = List<Identifier>

/**
 * [DependencyGraph]s represent how inputs of a Paxel [Expression] contribute to its outputs.
 *
 * A [DependencyGraph] represents a Directed-Acyclic-Graph that maps fields of an output handle
 * connection to fields in other handle connections.
 *
 * - [DependencyGraph.Input] represents a source handle connection and access path.
 * - [DependencyGraph.Derive] indicates that an input has been modified in the Paxel expression.
 * - [DependencyGraph.Associate] connects partial access paths to other nodes in the graph. These
 *   are used to form left-hand-side / right-hand-side relations between handle connections.
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
 *   DependencyGraph.Associate(
 *    "ratio" to DependencyGraph.Associate(
 *      "trained" to DependencyGraph.Input("input", "cats"),
 *      "total" to DependencyGraph.Derive(
 *        DependencyGraph.Input("input", "cats"),
 *        DependencyGraph.Input("input", "dogs")
 *      )
 *    ),
 *    "family" to DependencyGraph.Input("input", "household"),
 *    "limit" to DependencyGraph.LITERAL
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
sealed class DependencyGraph {

  /** Substitute aliases in all paths. */
  abstract fun substitute(aliases: Associate): DependencyGraph

  /** Union of two [DependencyGraph] collections. */
  abstract infix fun union(other: DependencyGraph): DependencyGraph

  /** An unmodified input (from a handle connection) used in a Paxel [Expression]. */
  data class Input(val path: Path = emptyList()) : DependencyGraph() {

    constructor(vararg paths: Identifier) : this(listOf(*paths))

    /** Return [Input] with all alias substitutions applied. */
    override fun substitute(aliases: Associate): Input = Input(path.substitute(aliases))

    /** Union of a [Input] and a [DependencyGraph]. */
    override infix fun union(other: DependencyGraph): DependencyGraph = when (other) {
      is Input -> Derive(this.path, other.path)
      is Derive -> Derive(setOf(this.path) + other.paths)
      is Associate -> throw UnsupportedOperationException(
        "Union of Input and Associate is not well defined."
      )
    }
  }

  /** Represents modification of an access path within a Paxel [Expression]. */
  data class Derive(val paths: Set<Path> = emptySet()) : DependencyGraph() {

    constructor(vararg paths: Path) : this(setOf(*paths))

    constructor(vararg inputs: Input) : this(inputs.map { it.path }.toSet())

    /** Union of a [Derive] and another [DependencyGraph]. */
    override infix fun union(other: DependencyGraph): DependencyGraph = when (other) {
      is Input -> Derive(this.paths + setOf(other.path))
      is Derive -> Derive(paths + other.paths)
      is Associate -> throw UnsupportedOperationException(
        "Union of Derive and Associate is not well defined."
      )
    }

    /** Substitute all aliases as a new [Derive] object. */
    override fun substitute(aliases: Associate) = Derive(
      paths.map { path -> path.substitute(aliases) }.toSet()
    )
  }

  /** Associates an [Identifier] with [DependencyGraph]s. */
  data class Associate(
    val associations: Map<Identifier, DependencyGraph> = emptyMap()
  ) : DependencyGraph() {

    constructor(vararg pairs: Pair<Identifier, DependencyGraph>) : this(pairs.toMap())

    /** Union of an [Associate] and another [DependencyGraph]. */
    override infix fun union(other: DependencyGraph): DependencyGraph = if (other is Associate) {
      Associate(
        associations = (this.associations.entries + other.associations.entries)
          .fold(mutableMapOf()) { acc, (key, value) ->
            acc += (key to (acc[key]?.let { it union value } ?: value))
            acc
          }
      )
    } else throw UnsupportedOperationException(
      "Union of Associate and non-Associate is not well defined."
    )

    /** Substitute all aliases in each [DependencyGraph] as a new [Associate]. */
    override fun substitute(aliases: Associate) = Associate(
      associations.mapValues { (_, deduction) -> deduction.substitute(aliases) }
    )
  }

  companion object {
    /** A [DependencyGraph] case to represent literals. */
    val LITERAL = Derive()
  }
}

/** Replaces all [Identifier]s with aliases in a [Path]. */
private fun Path.substitute(aliases: DependencyGraph.Associate): Path {
  return if (isEmpty()) emptyList()
  else {
    this[0].let { identifier ->
      val association = aliases.associations.getOrDefault(
        identifier,
        DependencyGraph.Input(identifier)
      )
      if (association is DependencyGraph.Input) association.path
      else throw UnsupportedOperationException(
        "Cannot substitute ${association::class.simpleName} for an Identifier."
      )
    } + this.drop(1)
  }
}
