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

fun BitSet.toString(transform: ((Int) -> String)?): String {
    if (transform == null) return "$this"
    var labels = mutableListOf<String>()
    var nextBit = nextSetBit(0)
    while (nextBit != -1) {
        labels.add(transform(nextBit))
        if (nextBit == Int.MAX_VALUE) break
        nextBit = nextSetBit(nextBit + 1)
    }
    return labels.joinToString(prefix = "{", postfix = "}")
}

/**
 * Returns a set of [BitSet] representation for the predicate using the given [indices] to
 * determine the index of an [InformationFlowLabel] in the bitset.
 */
fun InformationFlowLabel.Predicate.asSetOfBitSets(
    indices: Map<InformationFlowLabel, Int>
): Set<BitSet> {
    // TODO(b/157530728): This is not very efficient. We will want to replace this with
    // an implementation that uses a Binary Decision Diagram (BDD).
    when (this) {
        is Predicate.Label -> {
            val result = BitSet(indices.size)
            result.set(requireNotNull(indices[label]))
            return setOf(result)
        }
        is Predicate.Not -> {
            val labelPredicate = requireNotNull(predicate as? Predicate.Label) {
                // TODO(b/157530728): It will be easy to handle `not` when we have a proper
                // datastructure like BDDs. For now, we only support `not` on labels.
                "Not is only supported for label predicates when converting to bitsets!"
            }
            val labelIndex = requireNotNull(indices[labelPredicate.label])
            // Not(A) = B \/ C ...
            return (0..(indices.size - 1)).mapNotNull { index ->
                if (index == labelIndex) null else BitSet(indices.size).apply { set(index) }
            }.toSet()
        }
        is Predicate.Or -> {
            val lhsBitSets = lhs.asSetOfBitSets(indices)
            val rhsBitSets = rhs.asSetOfBitSets(indices)
            return lhsBitSets union rhsBitSets
        }
        is Predicate.And -> {
            val lhsBitSets = lhs.asSetOfBitSets(indices)
            val rhsBitSets = rhs.asSetOfBitSets(indices)
            val result = mutableSetOf<BitSet>()
            lhsBitSets.forEach { lhsBitSet ->
                rhsBitSets.forEach { rhsBitSet ->
                    val combined = BitSet(indices.size)
                    combined.or(lhsBitSet)
                    combined.or(rhsBitSet)
                    result.add(combined)
                }
            }
            return result.toSet()
        }
    }
}
