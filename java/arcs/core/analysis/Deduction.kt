package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.expression.Expression

/** Field [Identifier]. Lists of [Identifier]s imply an AccessPath.*/
typealias Identifier = String

/**
 * Result of the [ExpressionClaimDeducer] on Paxel [Expression]s.
 *
 * [Deduction]s recursively associate identifiers to field paths. These relationships can be
 * directly translated into [Claim]s and [AccessPath]s.
 */
data class Deduction(
  val derivations: Analysis = Analysis.Scope(),
  val context: Map<Identifier, Analysis> = emptyMap()
) {

  operator fun plus(other: Deduction) = Deduction(
    derivations + other.derivations,
    context + other.context
  )

  fun removeEmpty(): Deduction = Deduction(derivations.removeEmpty(), context)

  /**
   * Claim analysis on Paxel [Expression]s.
   *
   * A recursive set of operations to define claim relationships between [Identifier]s in Paxel
   * [Expression]s.
   */
  sealed class Analysis {
    /** Returns true if the [Analysis] collection has no members. */
    open fun isEmpty(): Boolean = true

    /** Returns true if the [Analysis] collection has some members. */
    fun isNotEmpty(): Boolean = !isEmpty()

    abstract fun removeEmpty(): Analysis

    /** Unwrap [Analysis] object to get an underlying [Path]. */
    abstract fun getPath(): Path

    /** Substitute aliases in all paths. */
    abstract fun substitute(aliases: Map<Identifier, Analysis>): Analysis

    abstract fun mergeTop(path: Analysis): Analysis

    abstract fun lookup(key: Identifier): Analysis


    abstract operator fun plus(other: Analysis): Analysis

    /** A representation of a field path in a Paxel [Expression]. */
    data class Path(val path: List<Identifier> = emptyList()) : Analysis() {

      constructor(vararg paths: Identifier) : this(paths.toList())

      /** Combine two [Path]s into a new [Path].*/
      operator fun plus(other: Path) = Path(path + other.path)

      /** Base-case: Returns self as underlying path.*/
      override fun getPath(): Path = this

      /** Returns true if there are no [Identifier]s in the field path. */
      override fun isEmpty() = path.isEmpty()

      /** Return [Path] with all alias substitutions applied. */
      override fun substitute(aliases: Map<Identifier, Analysis>): Path =
        Path(
          path.flatMap { identifier ->
            aliases.getOrDefault(identifier, Paths(Path(identifier))).getPath().path
          }
        )

      override fun removeEmpty(): Path = Path(path.filter { it.isNotEmpty() })


      override fun mergeTop(path: Analysis): Analysis {
        TODO("Not yet implemented")
      }

      override fun lookup(key: Identifier): Analysis {
        TODO("Not yet implemented")
      }

      override fun plus(other: Analysis): Analysis = when(other) {
        is Path -> Path(path + other.path)
        is Paths -> Paths(this) + other
        is Scope -> Paths(this) + Paths(other)
        is Equal -> Equal(Paths(this) + other.op)
        is Derive -> Derive(Paths(this) + other.op)
      }
    }

    /** A collection of field [Path]s. */
    data class Paths(val paths: List<Analysis> = emptyList()) : Analysis() {

      constructor(vararg paths: Analysis) : this(paths.toList())

      constructor(vararg paths: List<Identifier>) : this(paths.map { Path(it) })

      /** Combine two [Paths] into a new [Paths] object. */
      operator fun plus(other: Paths) = Paths(paths + other.paths)

      /** Adds extra identifiers to the first [Path] in the collection. */
      override fun mergeTop(path: Analysis) = Paths(listOf(getPath() + path.getPath()) + paths.drop(1))
      override fun lookup(key: Identifier): Analysis {
        TODO("Not yet implemented")
      }

      override fun plus(other: Analysis): Analysis = when(other) {
        is Path -> this + Paths(other)
        is Paths -> this + other
        is Scope -> this + Paths(other)
        is Equal -> Equal(this + other.op)
        is Derive -> Derive(this + other.op)
      }

      /** Returns true if there are no [Analysis] objects in the collection. */
      override fun isEmpty() = paths.isEmpty()

      override fun removeEmpty(): Paths = Paths(paths.filter { it.isNotEmpty() })

      /** Returns the first [Path] in the collection, or an empty [Path]. */
      override fun getPath(): Path = if (isNotEmpty()) paths.first().getPath() else Path()

      /** Substitute all aliases as a new [Paths] object. */
      override fun substitute(aliases: Map<Identifier, Analysis>) =
        Paths(paths.map { path -> path.substitute(aliases) })
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
          .fold(emptyMap()) { acc, (key, list) ->
            acc + (key to (acc[key]?.plus(list) ?: list))
          }
      )

      override fun removeEmpty(): Scope =
        Scope(
          associations = associations.entries
            .map { (key, list) -> key to list.filter(Analysis::isNotEmpty) }
            .fold(emptyMap()) { acc, (key, list) ->
              acc + (key to list)
            }
        )

      /** Returns a new [Scope] with only the queried association. */
      override fun lookup(key: Identifier): Scope {
        require(key in associations) {
          "Scope does not associate anything with '$key'."
        }
        return Scope(key to associations.getOrDefault(key, emptyList()))
      }

      override fun plus(other: Analysis): Analysis = when(other) {
        is Path -> Paths(this) + Paths(other)
        is Paths -> Paths(this) + other
        is Scope -> this + other
        is Equal -> Equal(this + other.op)
        is Derive -> Derive(this + other.op)
      }

      /** Returns true if there are no associations. */
      override fun isEmpty() = associations.isEmpty()

      /** [Path]s are not well defined on [Scope]s. */
      override fun getPath() =
        throw UnsupportedOperationException("Path not well defined on Scope object.")

      /** Substitute all Aliases in each associated [Analysis] object as a new [Scope]. */
      override fun substitute(aliases: Map<Identifier, Analysis>) =
        Scope(
          associations = associations.entries
            .map { (key, list) -> key to list.map { analysis -> analysis.substitute(aliases) } }
            .fold(emptyMap()) { acc, (key, list) -> acc + (key to list) }
        )

      override fun mergeTop(path: Analysis): Analysis {
        TODO("Not yet implemented")
      }
    }

    /** Used to indicate an Equality Claim. */
    data class Equal(val op: Analysis) : Analysis() {

      /** Returns true if child [Analysis] is empty. */
      override fun isEmpty(): Boolean = op.isEmpty()

      override fun removeEmpty(): Equal = Equal(op.removeEmpty())

      /** Unwraps claim and returns underlying [Path]. */
      override fun getPath(): Path = op.getPath()

      /** Apply alias substitutions for [Equal] claim. */
      override fun substitute(aliases: Map<Identifier, Analysis>) = Equal(op.substitute(aliases))
      override fun mergeTop(path: Analysis): Analysis {
        TODO("Not yet implemented")
      }

      override fun lookup(key: Identifier): Analysis {
        TODO("Not yet implemented")
      }

      override fun plus(other: Analysis): Analysis = op + other
    }

    /** Used to indicate a Derivation Claim. */
    data class Derive(val op: Analysis) : Analysis() {

      /** Returns true if child [Analysis] is empty. */
      override fun isEmpty(): Boolean = op.isEmpty()

      override fun removeEmpty(): Derive = Derive(op.removeEmpty())

      /** Unwraps claim and returns underlying [Path]. */
      override fun getPath(): Path = op.getPath()

      /** Apply alias substitutions for [Derive] claim. */
      override fun substitute(aliases: Map<Identifier, Analysis>) = Derive(op.substitute(aliases))
      override fun mergeTop(path: Analysis): Analysis {
        TODO("Not yet implemented")
      }

      override fun lookup(key: Identifier): Analysis {
        TODO("Not yet implemented")
      }

      override fun plus(other: Analysis): Analysis = op + other
    }
  }
}
