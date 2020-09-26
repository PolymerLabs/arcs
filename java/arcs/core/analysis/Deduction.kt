package arcs.core.analysis

import arcs.core.analysis.Deduction.Analysis
import arcs.core.data.Claim
import arcs.core.data.expression.Expression

/**
 * Result of the [ExpressionClaimDeducer] on Paxel [Expression]s.
 *
 * [Deduction]s recursively associate identifiers to field paths. These relationships can be
 * directly translated into [Claim]s.
 *
 * [Deduction]s hold a [Analysis.Scope], which recursively associates [Identifier]s to [Path]s, and
 * [Analysis.Paths], which are a flattened list of all [Path]s found in the [Analysis.Scope].
 *
 * With `scope`, information flows top-down, whereas `context` bubbles information bottom-up.
 */
data class Deduction(
  val scope: Analysis.Scope = Analysis.Scope(),
  val context: Analysis.Paths = Analysis.Paths()
) {
  /** Merge two [Deduction]s into a new [Deduction]. */
  operator fun plus(other: Deduction) = Deduction(scope + other.scope, context + other.context)

  /**
   * Claim analysis on Paxel [Expression]s.
   *
   * A recursive set of operations to define claim relationships between identifiers in Paxel
   * [Expression]s.
   */
  sealed class Analysis {
    /** Returns true if the [Analysis] collection has no members. */
    open fun isEmpty(): Boolean = true

    /** Returns true if the [Analysis] collection has some members. */
    fun isNotEmpty(): Boolean = !isEmpty()

    /** Unwrap [Analysis] object to get an underlying [Path]. */
    abstract fun getPath(): Path

    /** A representation of a field path in a Paxel expression. */
    data class Path(val path: List<Identifier> = emptyList()) : Analysis() {

      constructor(vararg paths: Identifier) : this(paths.toList())

      /** Combine two [Path]s into a new [Path].*/
      operator fun plus(other: Path) = Path(path + other.path)

      /** Base-case: Returns self as underlying path.*/
      override fun getPath(): Path = this
    }

    /** A collection of field [Path]s. */
    data class Paths(val paths: List<Analysis> = emptyList()) : Analysis() {

      constructor(vararg paths: Analysis) : this(paths.toList())

      constructor(vararg paths: List<Identifier>) : this(paths.map { Path(it) })

      /** Combine two [Paths] into a new [Paths] object. */
      operator fun plus(other: Paths) = Paths(paths + other.paths)

      /**
       * Adds extra identifiers to the first [Path] in the collection.
       * Creates first path when the collection is empty.
       */
      fun mergeTop(path: Analysis) = Paths(listOf(getPath() + path.getPath()) + paths.drop(1))

      /** Merge the first [Path] in the collection with a new [Path]. */
      fun mergeTop(path: List<Identifier>) = mergeTop(Path(path))

      override fun isEmpty() = paths.isEmpty()

      /** Returns the first [Path] in the collection, or an empty [Path]. */
      override fun getPath(): Path = if (isNotEmpty()) paths.first().getPath() else Path()
    }

    /** Associates an [Identifier] with a group of [Analysis]s. */
    data class Scope(
      val associations: Map<Identifier, List<Analysis>> = emptyMap()
    ) : Analysis() {

      constructor(vararg pairs: Pair<Identifier, List<Analysis>>) : this(pairs.toMap())

      /**
       * Combine two [Scope]s into a new [Scope].
       *
       * The resulting [Scope] will not have any empty [Analysis] associations.
       */
      operator fun plus(other: Scope): Scope = Scope(
        associations = (associations.entries + other.associations.entries)
          .map { (key, list) -> key to list.filter(Analysis::isNotEmpty) }
          .fold(emptyMap()) { acc: Map<Identifier, List<Analysis>>, (key, list) ->
            acc + (key to (acc[key]?.plus(list) ?: list))
          }
      )

      fun lookup(key: Identifier): Scope {
        require(key in associations) {
          "Scope does not associate anything with '$key'."
        }
        return Scope(key to associations.getOrDefault(key, emptyList()))
      }

      override fun isEmpty() = associations.isEmpty()

      /** [Path]s are not well defined on [Scope]s. */
      override fun getPath() =
        throw UnsupportedOperationException("Path not well defined on Scope object.")
    }

    /** Used to indicate an Equality Claim. */
    data class Equal(val op: Analysis) : Analysis() {
      override fun isEmpty(): Boolean = op.isEmpty()

      /** Unwraps claim and returns underlying [Path]. */
      override fun getPath(): Path = op.getPath()
    }

    /** Used to indicate a Derivation Claim. */
    data class Derive(val op: Analysis) : Analysis() {
      override fun isEmpty(): Boolean = op.isEmpty()

      /** Unwraps claim and returns underlying [Path]. */
      override fun getPath(): Path = op.getPath()
    }
  }
}
