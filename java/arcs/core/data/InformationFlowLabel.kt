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
        data class Label(val label: InformationFlowLabel) : Predicate()
        data class Not(val predicate: Predicate) : Predicate()
        data class Or(val lhs: Predicate, val rhs: Predicate) : Predicate()
        data class And(val lhs: Predicate, val rhs: Predicate) : Predicate()

        infix fun and(other: Predicate) = Predicate.And(this, other)
        infix fun or(other: Predicate) = Predicate.Or(this, other)
        fun not() = Predicate.Not(this)
    }
}
