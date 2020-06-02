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

import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import java.util.BitSet

/**
 * Represents a conjunct in a Disjunctive Normal Form (DNF).
 *
 * [mask] determines the set of indices that are valid in [bits]. Suppose that the universe of
 * labels is {A, B, C}. Here are some examples of how various conjuncts are represented:
 *
 *      Conjunction : (mask, bits)
 *                A : (100, 100)
 *           not(A) : (100, 000)
 *          A and B : (110, 110)
 *     A and not(B) : (110, 100)
 */
data class Conjunct(val mask: BitSet, val bits: BitSet)

/**
 * Returns the predicate in Disjunctive Normal Form (DNF) as [Set<Conjunct>].
 *
 * The [indices] map is used to determine the index of an [InformationFlowLabel] in the bitset of
 * the conjuncts. Suppose that the universe of labels is {A, B, C}. Here are some examples:
 *
 *          Predicate : {(mask, bits)}
 *                  A : {(100, 100)}
 *             not(A) : {(100, 000)}
 *            A and B : {(110, 110)}
 *       A and not(B) : {(110, 100)}
 *             A or B : {(100, 100), (010, 010)}
 *        A or not(B) : {(100, 100), (010, 000)}
 *   (A and B) or (C) : {(110, 110), (001, 001)}
 */
fun InformationFlowLabel.Predicate.asDNF(
    indices: Map<InformationFlowLabel, Int>
): Set<Conjunct> {
    // TODO(b/157530728): This is not very efficient. We will want to replace this with
    // an implementation that uses a Binary Decision Diagram (BDD).
    when (this) {
        is Predicate.Label -> {
            val index = indices.getValue(label)
            val result = BitSet(indices.size).apply { set(index) }
            return setOf(Conjunct(result, result))
        }
        is Predicate.Not -> {
            val labelPredicate = requireNotNull(predicate as? Predicate.Label) {
                // TODO(b/157530728): It will be easy to handle `not` when we have a proper
                // datastructure like BDDs. For now, we only support `not` on labels.
                "Not is only supported for label predicates when converting to bitsets!"
            }
            val index = indices.getValue(labelPredicate.label)
            val mask = BitSet(indices.size).apply { set(index) }
            val result = BitSet(indices.size)
            return setOf(Conjunct(mask, result))
        }
        is Predicate.Or -> {
            val lhsConjuncts = lhs.asDNF(indices)
            val rhsConjuncts = rhs.asDNF(indices)
            return lhsConjuncts union rhsConjuncts
        }
        is Predicate.And -> {
            val lhsConjuncts = lhs.asDNF(indices)
            val rhsConjuncts = rhs.asDNF(indices)
            return lhsConjuncts.and(rhsConjuncts, indices)
        }
    }
}

/** Returns the DNF form for ([this] and [that]) by applying distributivity law. */
private fun Set<Conjunct>.and(
    that: Set<Conjunct>,
    indices: Map<InformationFlowLabel, Int>
): Set<Conjunct> {
    val result = mutableSetOf<Conjunct>()
    // Apply distributivity law.
    forEach { (thisMask, thisBits) ->
        that.forEach { (thatMask, thatBits) ->
            val commonThisBits = BitSet(indices.size).apply {
                or(thisMask)
                and(thatMask)
                and(thisBits)
            }
            val commonThatBits = BitSet(indices.size).apply {
                or(thisMask)
                and(thatMask)
                and(thatBits)
            }
            // Make sure that the common bits match. If they don't match, then this
            // combination is contradiction and, therefore, is not included in the result.
            if (commonThatBits == commonThisBits) {
                val combinedMask = BitSet(indices.size).apply {
                    or(thisMask)
                    or(thatMask)
                }
                val combinedBits = BitSet(indices.size).apply {
                    or(thisBits)
                    or(thatBits)
                }
                result.add(Conjunct(combinedMask, combinedBits))
            }
        }
    }
    return result.toSet()
}
