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
 * Returns the predicate in Disjunctive Normal Form (DNF) as a set of [BitSet] pairs.
 *
 * The first [BitSet] in the pair is a mask that determines the set of valid bits in the second
 * [BitSet]. The [indices] map is used to determine the index of an [InformationFlowLabel] in the
 * bitset. Suppose that the universe of labels is {A, B, C}. Here are some examples:
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
): Set<Pair<BitSet, BitSet>> {
    // TODO(b/157530728): This is not very efficient. We will want to replace this with
    // an implementation that uses a Binary Decision Diagram (BDD).
    when (this) {
        is Predicate.Label -> {
            val index = requireNotNull(indices[label])
            val result = BitSet(indices.size).apply { set(index) }
            return setOf(result to result)
        }
        is Predicate.Not -> {
            val labelPredicate = requireNotNull(predicate as? Predicate.Label) {
                // TODO(b/157530728): It will be easy to handle `not` when we have a proper
                // datastructure like BDDs. For now, we only support `not` on labels.
                "Not is only supported for label predicates when converting to bitsets!"
            }
            val index = requireNotNull(indices[labelPredicate.label])
            val mask = BitSet(indices.size).apply { set(index) }
            val result = BitSet(indices.size)
            return setOf(mask to result)
        }
        is Predicate.Or -> {
            val lhsBitSets = lhs.asDNF(indices)
            val rhsBitSets = rhs.asDNF(indices)
            return lhsBitSets union rhsBitSets
        }
        is Predicate.And -> {
            val lhsBitSets = lhs.asDNF(indices)
            val rhsBitSets = rhs.asDNF(indices)
            val result = mutableSetOf<Pair<BitSet, BitSet>>()
            // Apply distributivity law.
            lhsBitSets.forEach { (lhsMask, lhsBitSet) ->
                rhsBitSets.forEach { (rhsMask, rhsBitSet) ->
                    val commonLhsBits = BitSet(indices.size).apply {
                        or(lhsMask)
                        and(rhsMask)
                        and(lhsBitSet)
                    }
                    val commonRhsBits = BitSet(indices.size).apply {
                        or(lhsMask)
                        and(rhsMask)
                        and(rhsBitSet)
                    }
                    // Make sure that the common bits match. If they don't match, then this
                    // combination is contradiction and, therefore, is not included in the result.
                    if (commonRhsBits == commonLhsBits) {
                        val combinedMask = BitSet(indices.size).apply {
                            or(lhsMask)
                            or(rhsMask)
                        }
                        val combined = BitSet(indices.size).apply {
                            or(lhsBitSet)
                            or(rhsBitSet)
                        }
                        result.add(combinedMask to combined)
                    }
                }
            }
            return result.toSet()
        }
    }
}
