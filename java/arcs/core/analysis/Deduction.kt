package arcs.core.analysis

import arcs.core.data.expression.Expression

/** Field [Identifier]. Lists of [Identifier]s imply an AccessPath.*/
typealias Identifier = String

/**
 * Result of the [ExpressionClaimDeducer] on Paxel [Expression]s.
 *
 * [Deduction]s recursively associate identifiers to field paths. These relationships can be
 * directly translated into [Claim]s and [AccessPath]s.
 */
/**
 * Claim Deduction on Paxel [Expression]s.
 *
 * A recursive set of operations to define claim relationships between [Identifier]s in Paxel
 * [Expression]s.
 */
sealed class Deduction {
  /** Returns true if the [Deduction] collection has no members. */
  open fun isEmpty(): Boolean = true

  /** Returns true if the [Deduction] collection has some members. */
  fun isNotEmpty(): Boolean = !isEmpty()

  /** Unwrap [Deduction] object to get an underlying [Path]. */
  abstract fun getPath(): Path

  /** Substitute aliases in all paths. */
  abstract fun substitute(aliases: Scope): Deduction

  /** Union of two [Deduction] collections. */
  abstract operator fun plus(other: Deduction): Deduction

  /** A representation of a field path in a Paxel [Expression]. */
  data class Path(val path: List<Identifier> = emptyList()) : Deduction() {

    constructor(vararg paths: Identifier) : this(paths.toList())


    /** Base-case: Returns self as underlying path.*/
    override fun getPath(): Path = this

    /** Returns true if there are no [Identifier]s in the field path. */
    override fun isEmpty() = path.isEmpty()

    /** Return [Path] with all alias substitutions applied. */
    override fun substitute(aliases: Scope): Path =
      Path(
        path.flatMap { identifier ->
          aliases.associations.getOrDefault(identifier, Paths(Path(identifier))).getPath().path
        }
      )

    fun mergeTop(other: Path) = Path(path  + other.path)

    /** Union of a [Path] and a [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Path -> Paths(this) + Paths(other)
      is Paths -> Paths(this) + other
      is Scope -> Paths(this) + Paths(other)
      is Equal -> Equal(Paths(this) + other.op)
      is Derive -> Derive(Paths(this) + other.op)
    }
  }

  /** A collection of field [Path]s. */
  data class Paths(val paths: List<Deduction> = emptyList()) : Deduction() {

    constructor(vararg paths: Deduction) : this(paths.toList())

    constructor(vararg paths: List<Identifier>) : this(paths.map { Path(it) })

    /** Union of a [Paths] and another [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Path -> this + Paths(other)
      is Paths -> Paths(paths + other.paths)
      is Scope -> this + Paths(other)
      is Equal -> Equal(this + other.op)
      is Derive -> Derive(this + other.op)
    }

    /** Returns true if there are no [Deduction] objects in the collection. */
    override fun isEmpty() = paths.isEmpty()

    /** Returns the first [Path] in the collection, or an empty [Path]. */
    override fun getPath(): Path = if (isNotEmpty()) paths.first().getPath() else Path()

    /** Substitute all aliases as a new [Paths] object. */
    override fun substitute(aliases: Scope) =
      Paths(paths.map { path -> path.substitute(aliases) })
  }

  /** Associates an [Identifier] with a group of [Deduction]s. */
  data class Scope(
    val associations: Map<Identifier, Deduction> = emptyMap()
  ) : Deduction() {

    constructor(vararg pairs: Pair<Identifier, Deduction>) : this(pairs.toMap())

    /** Returns a new [Scope] with only the queried association. */
    fun lookup(key: Identifier): Scope {
      require(key in associations) {
        "Scope does not associate anything with '$key'."
      }
      return Scope(key to associations.getOrDefault(key, Paths()))
    }

    /** Union of a [Scope] and another [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Path -> Paths(this) + Paths(other)
      is Paths -> Paths(this) + other
      is Scope -> Scope(this.associations + other.associations)
      is Equal -> Equal(this + other.op)
      is Derive -> Derive(this + other.op)
    }

    /** Returns true if there are no associations. */
    override fun isEmpty() = associations.isEmpty()

    /** [Path]s are not well defined on [Scope]s. */
    override fun getPath() =
      throw UnsupportedOperationException("Path not well defined on Scope object.")

    /** Substitute all Aliases in each associated [Deduction] object as a new [Scope]. */
    override fun substitute(aliases: Scope) =
      Scope(
        associations = associations
          .mapKeys { (key, _) -> aliases.associations.getOrDefault(key, Path(key)).getPath().path.first() }
          .mapValues { (_, Deduction) -> Deduction.substitute(aliases) }
      )
  }

  /** Used to indicate an Equality Claim. */
  data class Equal(val op: Deduction) : Deduction() {

    /** Returns true if child [Deduction] is empty. */
    override fun isEmpty(): Boolean = op.isEmpty()

    /** Unwraps claim and returns underlying [Path]. */
    override fun getPath(): Path = op.getPath()

    /** Apply alias substitutions for [Equal] claim. */
    override fun substitute(aliases: Scope) = Equal(op.substitute(aliases))

    /** Union of an [Equal] and another [Deduction]. */
    override fun plus(other: Deduction): Deduction = op + other
  }

  /** Used to indicate a Derivation Claim. */
  data class Derive(val op: Deduction) : Deduction() {

    /** Returns true if child [Deduction] is empty. */
    override fun isEmpty(): Boolean = op.isEmpty()

    /** Unwraps claim and returns underlying [Path]. */
    override fun getPath(): Path = op.getPath()

    /** Apply alias substitutions for [Derive] claim. */
    override fun substitute(aliases: Scope) = Derive(op.substitute(aliases))

    /** Union of an [Derive] and another [Deduction]. */
    override fun plus(other: Deduction): Deduction = op + other
  }
}
