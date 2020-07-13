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

package arcs.core.data

/** Represents various kinds of information flow labels. */
sealed class InformationFlowLabel {
    /**
     * A tag that captures an application-level concept.
     *
     * Examples of such tags are `PackageName`, `CoarseLocation`, etc.
     */
    data class SemanticTag(val name: String) : InformationFlowLabel() {
        override fun toString() = name
    }

    // TODO(bgogul): expand the labels to be also handles, stores, etc.

    /** Represents a boolean expression of [InformationFlowLabel] constants. */
    sealed class Predicate {
        data class Label(val label: SemanticTag) : Predicate() {
            override fun toString() = "$label"
        }

        data class Not(val predicate: Predicate) : Predicate() {
            override fun toString() = "not $predicate"
        }

        data class Or(val lhs: Predicate, val rhs: Predicate) : Predicate() {
            override fun toString() = "($lhs or $rhs)"
        }

        data class And(val lhs: Predicate, val rhs: Predicate) : Predicate() {
            override fun toString() = "($lhs and $rhs)"
        }

        infix fun and(other: Predicate) = And(this, other)
        infix fun or(other: Predicate) = Or(this, other)
        fun not() = Not(this)

        companion object {
            /** Combines predicates via the [And] operator (must supply at least two). */
            fun and(vararg predicates: Predicate): And = combine(predicates) { a, b -> a and b }

            /** Combines predicates via the [Or] operator (must supply at least two). */
            fun or(vararg predicates: Predicate): Or = combine(predicates) { a, b -> a or b }

            /** Combines a list of >= 2 predicates with the given accumulator. */
            private fun <T : Predicate> combine(
                predicates: Array<out Predicate>,
                acc: (Predicate, Predicate) -> T
            ): T {
                require(predicates.size >= 2) {
                    "Require at least 2 predicates, received ${predicates.size}."
                }
                val initial = acc(predicates[0], predicates[1])
                if (predicates.size == 2) {
                    return initial
                }
                return predicates.toList().subList(2, predicates.size).fold(initial, acc)
            }
        }
    }
}
