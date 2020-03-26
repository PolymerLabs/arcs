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

package arcs.core.analysis

/**
 * An interface for defining the values of an abstract domain commonly used in abstract
 * interpretation frameworks (https://en.wikipedia.org/wiki/Abstract_interpretation).
 *
 * An abstract domain is typically defined as a mathematical lattice, but they don't have to be in
 * general. The interface here is designed to be general enough to allow abstract domains that are
 * not lattices (https://en.wikipedia.org/wiki/Lattice_(order)). To that extent, we only expect
 * the implementing class to provide an [isEquivalentTo] method that returns true if two abstract
 * values are semantically equivalent. The [isEquivalentTo] method is also used to determine if we
 * have reached a fixpoint when using iterative algorithms to solve the data flow equations for the
 * problem at hand (https://en.wikipedia.org/wiki/Data-flow_analysis). For abstract domains that are
 * lattices, the [isEquivalentTo] method can be used to compute the partial order as follows:
 *    `a.isLessThanEqual(b)` <=> `b.isEquivalentTo(a.join(b))` [for join semi-lattice]
 *    `a.isLessThanEqual(b)` <=> `a.isEquivalentTo(a.meet(b))` [for meet semi-lattice]
 *
 * For more details on the theory behind abstract interpretation, consult the following papers:
 *   - Cousot, Patrick; Cousot, Radhia. "Abstract Interpretation: A Unified Lattice Model for
 *     Static Analysis of Programs by Construction or Approximation of Fixpoints", In Principles
 *     of Programming Languages (POPL), 1977.
 *   - Cousot, Patrick; Cousot, Radhia. Abstract interpretation frameworks. Journal of Logic and
 *     Computation, 2(4):511—547, August 1992.
 */
interface AbstractValue<V : AbstractValue<V>> {
    /**
     * Returns true if the two values are semantically equivalent.
     *
     * Note that this is semantic equivalence and not structural equality. This method is
     * used to determine if we have reached a fix point. For some domains, this may simply
     * be structural equality.
     */
    infix fun isEquivalentTo(other: V): Boolean

    /**
     * Returns true if the instance represents `Bottom`. `Bottom` is the lowest value in the domain
     * lattice or represents an empty set of concrete values.
     */
    fun isBottom(): Boolean

    /**
     * Returns true if the instance represents `Top`. `Top` is the greatest value in the domain
     * lattice or represents the universe of concrete values.
     */
    fun isTop(): Boolean

    /** Returns the least upper bound of the values for lattices or a widened value. */
    infix fun join(other: V): V

    /** Returns the greatest lower bound of the values for lattices or narrowed value. */
    infix fun meet(other: V): V

    /**
     * Returns the widened value.
     *
     * A widening operator is used to ensure that the increasing fixpoint computation terminates for
     * domains with infinite ascending chains in its lattice or even to accelerate fixpoint
     * computations (at the cost of precision) for domains with no infinite ascending chains. For
     * lattices of finite height, this can be the same as join.
     *
     * Also, note that the widen operator is not commutative.
     */
    infix fun widen(other: V) = (this join other)

    /**
     * Returns the narrowed value.
     *
     * A narrowing operator is the dual of widen and used to ensure that decreasing fixpoint
     * computation terminates for domains with lattices of infinite height. For lattices of finite
     * height, this can be the same as meet.
     *
     * Also, note that the narrow operator is not commutative.
     */
    infix fun narrow(other: V) = (this meet other)
}
