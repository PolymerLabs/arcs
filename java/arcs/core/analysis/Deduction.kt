package arcs.core.analysis

import arcs.core.data.expression.Expression

/** Field [Identifier]. */
typealias Identifier = String

/** Lists of [Identifier]s imply an AccessPath. */
typealias Path = List<Identifier>

/**
 * [Deduction]s represent how inputs of a Paxel [Expression] contribute to its outputs.
 *
 * [Deduction]s recursively associate identifiers to field paths. These relationships can be
 * directly translated into [Claim]s and [AccessPath]s.
 */
sealed class Deduction {

  /** Substitute aliases in all paths. */
  abstract fun substitute(aliases: Scope): Deduction

  /** Union of two [Deduction] collections. */
  abstract operator fun plus(other: Deduction): Deduction

  /** A representation of a lookup claim in a Paxel [Expression]. */
  data class Equal(val path: Path = emptyList()) : Deduction() {

    constructor(vararg paths: Identifier) : this(paths.toList())

    /** Return [Equal] with all alias substitutions applied. */
    override fun substitute(aliases: Scope): Equal = Equal(
      path.flatMap { identifier ->
        when (val association = aliases.associations.getOrDefault(identifier, Equal(identifier))) {
          is Equal -> association.path
          is Derive -> association.firstPath().path
          is Scope -> throw UnsupportedOperationException(
            "Cannot substitute a Scope for an Identifier."
          )
        }
      }
    )

    /** Union of a [Equal] and a [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Equal -> Derive(this.path) + Derive(other.path)
      is Derive -> Derive(this.path) + other
      is Scope -> throw UnsupportedOperationException(
        "Union of Equal and Scope is not well defined."
      )
    }
  }

  /** A representation of a Derivation claim in a Paxel [Expression]. */
  data class Derive(val paths: List<Path> = emptyList()) : Deduction() {

    constructor(vararg paths: Path) : this(paths.toList())

    /** Union of a [Derive] and another [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Equal -> this + Derive(other.path)
      is Derive -> Derive(paths + other.paths)
      is Scope -> throw UnsupportedOperationException(
        "Union of Derive and Scope is not well defined."
      )
    }

    /** Returns the first [Equal] in the collection, or an empty [Equal]. */
    fun firstPath(): Equal = if (paths.isNotEmpty()) Equal(paths.first()) else Equal()

    /** Substitute all aliases as a new [Derive] object. */
    override fun substitute(aliases: Scope) = Derive(
      paths.map { path -> Equal(path).substitute(aliases).path }
    )
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
      return Scope(key to associations.getOrDefault(key, Derive()))
    }

    /** Union of a [Scope] and another [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Equal -> this + Derive(other.path)
      is Derive -> this + other
      is Scope -> Scope(
        associations = (this.associations.entries + other.associations.entries)
          .fold(emptyMap()) { acc, (key, value) ->
            val result = when(val existing = acc[key]) {
              null -> value
              is Equal -> Derive(existing.path) + value
              else -> existing + value
            }
            acc + (key to result)
          }
      )
    }

    /** Substitute all Aliases in each associated [Deduction] object as a new [Scope]. */
    override fun substitute(aliases: Scope) = Scope(
      associations = associations
        .mapKeys { (key, _) ->
          (aliases.associations.getOrDefault(key, Equal(key)) as Equal).path.first()
        }
        .mapValues { (_, Deduction) -> Deduction.substitute(aliases) }
    )
  }

  companion object {
    /** A [Deduction] case to represent literals. */
    val Empty = Derive()
  }
}
