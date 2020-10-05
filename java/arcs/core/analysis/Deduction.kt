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
sealed class Deduction {

  /** Unwrap [Deduction] object to get an underlying [Path]. */
  abstract fun getPath(): Path

  /** Substitute aliases in all paths. */
  abstract fun substitute(aliases: Scope): Deduction

  /** Union of two [Deduction] collections. */
  abstract operator fun plus(other: Deduction): Deduction

  /** [Deduction]s that have a simple path (a list of [Identifier]s). */
  interface Pathlike {
    val path: List<Identifier>
    fun mergeTop(other: Pathlike): Deduction
  }

  /** A representation of a field path in a Paxel [Expression]. */
  data class Path(override val path: List<Identifier> = emptyList()) : Deduction(), Pathlike {

    constructor(vararg paths: Identifier) : this(paths.toList())

    /** Base-case: Returns self as underlying path.*/
    override fun getPath(): Path = this

    /** Return [Path] with all alias substitutions applied. */
    override fun substitute(aliases: Scope): Path =
      Path(
        path.flatMap { identifier ->
          aliases.associations.getOrDefault(identifier, Paths(Path(identifier))).getPath().path
        }
      )

    /** Append more [Identifier]s to the [Path] */
    override fun mergeTop(other: Pathlike) = Path(path + other.path)

    /** Union of a [Path] and a [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Path -> Paths(this) + Paths(other)
      is Paths -> Paths(this) + other
      is Scope -> Paths(this) + Paths(other)
      else -> this + other
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
      else -> this + other
    }

    /** Returns the first [Path] in the collection, or an empty [Path]. */
    override fun getPath(): Path = if (paths.isNotEmpty()) paths.first().getPath() else Path()

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
      else -> this + other
    }

    /** [Path]s are not well defined on [Scope]s. */
    override fun getPath() =
      throw UnsupportedOperationException("Path not well defined on Scope object.")

    /** Substitute all Aliases in each associated [Deduction] object as a new [Scope]. */
    override fun substitute(aliases: Scope) =
      Scope(
        associations = associations
          .mapKeys { (key, _) -> aliases.associations
            .getOrDefault(key, Path(key)).getPath().path.first()
          }
          .mapValues { (_, Deduction) -> Deduction.substitute(aliases) }
      )
  }

  /** Used to indicate an Equality Claim. */
  data class Equal(val op: Deduction) : Deduction(), Pathlike {

    override val path = getPath().path

    /** Unwraps claim and returns underlying [Path]. */
    override fun getPath(): Path = op.getPath()

    /** Apply alias substitutions for [Equal] claim. */
    override fun substitute(aliases: Scope) = Equal(op.substitute(aliases))

    /** Union of an [Equal] and another [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Equal -> Derive(op + other.op)
      is Derive -> Derive(op + other.op)
      else -> Derive(op + other)
    }

    /** Append [Identifier]s to wrapped [Path]. */
    override fun mergeTop(other: Pathlike): Deduction = when (op) {
      is Pathlike -> Equal(op.mergeTop(other))
      else -> throw UnsupportedOperationException(
        "Contained Deduction ${op::class.simpleName} does not permit `mergeTop` operation."
      )
    }
  }

  /** Used to indicate a Derivation Claim. */
  data class Derive(val op: Deduction) : Deduction(), Pathlike {

    /** Underlying [Path] of wrapped [Deduct] */
    override val path = getPath().path

    /** Unwraps claim and returns underlying [Path]. */
    override fun getPath(): Path = op.getPath()

    /** Apply alias substitutions for [Derive] claim. */
    override fun substitute(aliases: Scope) = Derive(op.substitute(aliases))

    /** Union of an [Derive] and another [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Equal -> Derive(op + other.op)
      is Derive -> Derive(op + other.op)
      else -> Derive(op + other)
    }

    /** Append [Identifier]s to wrapped [Path]. */
    override fun mergeTop(other: Pathlike): Deduction = when (op) {
      is Pathlike -> Derive(op.mergeTop(other))
      else -> throw UnsupportedOperationException(
        "Contained Deduction ${op::class.simpleName} does not permit `mergeTop` operation."
      )
    }
  }
}
