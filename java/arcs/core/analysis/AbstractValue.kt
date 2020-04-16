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
 * An abstract domain is typically defined as a mathematical lattice, but they don't have to be a
 * lattice in general. The interface here is designed to be general enough to allow abstract domains
 * that are not lattices (https://en.wikipedia.org/wiki/Lattice_(order)). To that extent, we only
 * expect the implementing class to provide an [isEquivalentTo] method that returns true if two
 * values are semantically equivalent. The [isEquivalentTo] method is used to determine if we
 * have reached a fixpoint when using iterative algorithms to solve the data flow equations for the
 * problem at hand (https://en.wikipedia.org/wiki/Data-flow_analysis). For abstract domains that are
 * lattices, the [isEquivalentTo] method can be used to compute the partial order as follows:
 *   - `a.isLessThanEqual(b)` <=> `b.isEquivalentTo(a.join(b))` [for join semi-lattice]
 *   - `a.isLessThanEqual(b)` <=> `a.isEquivalentTo(a.meet(b))` [for meet semi-lattice]
 *
 * For more details on the theory behind abstract interpretation, consult the following papers:
 *   - Cousot, Patrick; Cousot, Radhia. "Abstract Interpretation: A Unified Lattice Model for
 *     Static Analysis of Programs by Construction or Approximation of Fixpoints", In Principles
 *     of Programming Languages (POPL), 1977.
 *   - Cousot, Patrick; Cousot, Radhia. Abstract interpretation frameworks. Journal of Logic and
 *     Computation, 2(4):511—547, August 1992.
 *
 * Note that this interface does not yet support domains with infinite ascending chains, which
 * would require the definition of `widen` and `narrow` operators.
 */
interface AbstractValue<V : AbstractValue<V>> {
    /**
     * Should be true if the instance represents `Bottom`. `Bottom` is the lowest value in the
     * domain lattice or represents an empty set of concrete values.
     */
    val isBottom: Boolean

    /**
     * Should be true if the instance represents `Top`. `Top` is the greatest value in the domain
     * lattice or represents the universe of concrete values.
     */
    val isTop: Boolean

    /**
     * Returns true if the two values are semantically equivalent.
     *
     * Note that this is semantic equivalence and not structural equality. This method is
     * used to determine if we have reached a fix point. For some domains, this may simply
     * be structural equality.
     */
    infix fun isEquivalentTo(other: V): Boolean

    /** Returns the least upper bound of the values for lattices or a widened value. */
    infix fun join(other: V): V

    /** Returns the greatest lower bound of the values for lattices or narrowed value. */
    infix fun meet(other: V): V
}
