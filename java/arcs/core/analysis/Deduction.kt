package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.expression.Expression

/** Field [Identifier]. */
private typealias Identifier = String

/** Lists of [Identifier]s imply an [AccessPath]. */
private typealias Path = List<Identifier>

private fun Path.substitute(aliases: Deduction.Scope): Path = if (isEmpty()) emptyList() else
  this[0].let { identifier ->
    val association = aliases.associations.getOrDefault(identifier, Deduction.Equal(identifier))
    if (association is Deduction.Equal) association.path else throw UnsupportedOperationException(
      "Cannot substitute ${association::class.simpleName} for an Identifier."
    )
  } + this.drop(1)

/**
 * [Deduction]s represent how inputs of a Paxel [Expression] contribute to its outputs.
 *
 * [Deduction]s recursively associate identifiers to field paths. These relationships can be
 * directly translated into [Claim]s and [AccessPath]s.
 *
 * Example:
 *   ```
 *   particle FooHousePets
 *     input: reads PetCount { cat: Number, dog: Number, foo: Text }
 *     output: writes =
 *       new Foo {
 *         a: new Bar {
 *           x: cat,
 *           y: dog,
 *         },
 *         b: foo,
 *         c: 5
 *       }
 *   ```
 *
 *   This can be translated to:
 *
 *   ```
 *   Deduction.Scope(
 *    "a" to Deduction.Scope(
 *      "x" to Deduction.Equal("cat"),
 *      "y" to Deduction.Equal("dog")
 *    ),
 *    "b" to Deduction.Equal("foo"),
 *    "c" to Deduction.EMPTY
 *   )
 *   ```
 *
 *   This, in turn, can be translated into the following claims:
 *
 *   ```
 *   claim output.a.x is input.cat
 *   claim output.a.y is input.dog
 *   claim output.b is input.foo
 *   ```
 */
sealed class Deduction {

  /** Substitute aliases in all paths. */
  abstract fun substitute(aliases: Scope): Deduction

  /** Union of two [Deduction] collections. */
  abstract infix fun union(other: Deduction): Deduction

  /**
   * A representation of a lookup claim in a Paxel [Expression].
   *
   * Example:
   *  ```
   *  claim output.bar is input.foo
   *  ```
   */
  data class Equal(val path: Path = emptyList()) : Deduction() {

    constructor(vararg paths: Identifier) : this(paths.toList())

    /** Return [Equal] with all alias substitutions applied. */
    override fun substitute(aliases: Scope): Equal = Equal(
      path.substitute(aliases)
    )

    /** Union of a [Equal] and a [Deduction]. */
    override fun union(other: Deduction): Deduction = when (other) {
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
    override fun union(other: Deduction): Deduction = when (other) {
      is Equal -> Derive(this.paths + setOf(other.path))
      is Derive -> Derive(paths + other.paths)
      is Scope -> throw UnsupportedOperationException(
        "Union of Derive and Scope is not well defined."
      )
    }

    /** Substitute all aliases as a new [Derive] object. */
    override fun substitute(aliases: Scope) = Derive(
      paths.map { path -> path.substitute(aliases) }.toSet()
    )
  }

  /** Associates an [Identifier] with a group of [Deduction]s. */
  data class Scope(
    val associations: Map<Identifier, Deduction> = emptyMap()
  ) : Deduction() {

    constructor(vararg pairs: Pair<Identifier, Deduction>) : this(pairs.toMap())

    /** Union of a [Scope] and another [Deduction]. */
    override fun union(other: Deduction): Deduction = if (other is Scope) {
      Scope(
        associations = (this.associations.entries + other.associations.entries)
          .fold(emptyMap()) { acc, (key, value) ->
            acc + (key to (acc[key]?.let { it union value } ?: value))
          }
      )
    } else throw UnsupportedOperationException("Union of Scope and non-Scope is not well defined.")

    /** Substitute all Aliases in each associated [Deduction] object as a new [Scope]. */
    override fun substitute(aliases: Scope) = Scope(
      associations.mapValues { (_, deduction) -> deduction.substitute(aliases) }
    )
  }

  companion object {
    /** A [Deduction] case to represent literals. */
    val LITERAL = Derive()
  }
}
