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
      path[0].let { identifier ->
        val association = aliases.associations.getOrDefault(identifier, Equal(identifier))
        if (association is Equal) association.path else throw UnsupportedOperationException(
          "Cannot substitute ${association::class.simpleName} for an Identifier."
        )
      } + path.drop(1)
    )

    /** Union of a [Equal] and a [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Equal -> Derive(this.path, other.path)
      is Derive -> Derive(setOf(this.path) + other.paths)
      is Scope -> throw UnsupportedOperationException(
        "Union of Equal and Scope is not well defined."
      )
    }
  }

  /** A representation of a Derivation claim in a Paxel [Expression]. */
  data class Derive(val paths: Set<Path> = emptySet()) : Deduction() {

    constructor(vararg paths: Path) : this(paths.toSet())

    /** Union of a [Derive] and another [Deduction]. */
    override fun plus(other: Deduction): Deduction = when (other) {
      is Equal -> Derive(this.paths + setOf(other.path))
      is Derive -> Derive(paths + other.paths)
      is Scope -> throw UnsupportedOperationException(
        "Union of Derive and Scope is not well defined."
      )
    }

    /** Substitute all aliases as a new [Derive] object. */
    override fun substitute(aliases: Scope) = Derive(
      paths.map { path -> Equal(path).substitute(aliases).path }.toSet()
    )
  }

  /** Associates an [Identifier] with a group of [Deduction]s. */
  data class Scope(
    val associations: Map<Identifier, Deduction> = emptyMap()
  ) : Deduction() {

    constructor(vararg pairs: Pair<Identifier, Deduction>) : this(pairs.toMap())

    /** Union of a [Scope] and another [Deduction]. */
    override fun plus(other: Deduction): Deduction = if (other is Scope) {
      Scope(
        associations = (this.associations.entries + other.associations.entries)
          .fold(emptyMap()) { acc, (key, value) ->
            acc + (key to (acc[key]?.let { it + value } ?: value))
          }
      )
    }
    else throw UnsupportedOperationException("Union of Scope and non-Scope is not well defined.")

    /** Substitute all Aliases in each associated [Deduction] object as a new [Scope]. */
    override fun substitute(aliases: Scope) = Scope(
      associations.mapValues { (_, Deduction) -> Deduction.substitute(aliases) }
    )
  }

  companion object {
    /** A [Deduction] case to represent literals. */
    val Empty = Derive()
  }
}
