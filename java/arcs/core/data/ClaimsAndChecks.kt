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

/** A class representing various kinds of information flow labels. */
sealed class InformationFlowLabel {
    /**
     * A tag that captures an application-level concept.
     *
     * Examples of the such tags are `PackageName`, `CoarseLocation`, etc.
     */
    data class SemanticTag(val name: String) : InformationFlowLabel() {
        override fun toString() = name
    }

    // TODO(bgogul): expand the labels to be also handles, stores, etc.
}

/** Represents a boolean expression of [InformationFlowLabel] constants. */
sealed class Predicate {
    data class Label(val label: InformationFlowLabel) : Predicate()
    data class Not(val predicate: Predicate) : Predicate()
    data class Or(val lhs: Predicate, val rhs: Predicate) : Predicate()
    data class And(val lhs: Predicate, val rhs: Predicate) : Predicate()
}

/** Describes a claim in a trusted particle. */
sealed class Claim {
    /** A claim to specify that [target] is only derived from [source]. */
    data class DerivesFrom(val target: AccessPath, val source: AccessPath) : Claim()

    /** A claim to specify that labels on [accessPath] satisfy [predicate]. */
    data class Assume(val accessPath: AccessPath, val predicate: Predicate) : Claim()
}

/** Describes a check in a trusted particle. */
sealed class Check {
    /** A check to specify that the labels on [accessPath] satisfy [predicate]. */
    data class Assert(val accessPath: AccessPath, val predicate: Predicate) : Check()
}
