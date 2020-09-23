package arcs.core.analysis

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

        /** A collection of field [Path]s. */
        data class Paths(val paths: List<Path> = emptyList()) : Analysis() {

            constructor(vararg paths: Path) : this(paths.toList())

            /** Combine two [Paths] into a new [Paths] object. */
            operator fun plus(other: Paths) = Paths(paths + other.paths)

            /**
             * Adds extra identifiers to the first [Path] in the collection.
             * Creates first path when the collection is empty.
             */
            fun mergeTop(path: Path) = if (paths.isEmpty()) {
                Paths(path)
            } else {
                Paths(listOf(paths.first() + path) + paths.drop(1))
            }

            override fun isEmpty() = paths.isEmpty()
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
        }

        /** Used to indicate an Equality Claim. */
        data class Equal(val op: Analysis) : Analysis() {
            override fun isEmpty(): Boolean = op.isEmpty()
        }

        /** Used to indicate a Derivation Claim. */
        data class Derive(val op: Analysis) : Analysis() {
            override fun isEmpty(): Boolean = op.isEmpty()
        }
    }
}
