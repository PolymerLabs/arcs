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

import java.util.BitSet

/**
 * An abstract value that is capable of representing a set of set of labels.
 *
 * Suppose that we have an universe of labels `{A, B, C}`. This class may be used to represents sets
 * of sets of labels like `{{A, B}, {A, C}}, {{A}, {B}, {C}}`.
 *
 * Currently, we use a set of bitsets for the underlying representation, where each bitset
 * represents a set of labels. Later, we can switch to more efficient representations like
 * Binary Decision Diagrams (BDD) without changing the interface.
 */
data class InformationFlowLabels(
    private val abstractLabelSets: AbstractSet<BitSet>
) : AbstractValue<InformationFlowLabels> {

    override val isBottom = abstractLabelSets.isBottom
    override val isTop = abstractLabelSets.isTop

    /** Returns the underlying set of set of labels if this is not `Top` or `Bottom`. */
    val labelSets: Set<BitSet>?
        get() = abstractLabelSets.set

    constructor(labelSets: Set<BitSet>) : this(AbstractSet<BitSet>(labelSets))

    override infix fun isEquivalentTo(other: InformationFlowLabels) =
        abstractLabelSets.isEquivalentTo(other.abstractLabelSets)

    override infix fun join(other: InformationFlowLabels) = InformationFlowLabels(
        abstractLabelSets.join(other.abstractLabelSets)
    )

    override infix fun meet(other: InformationFlowLabels) = InformationFlowLabels(
        abstractLabelSets.meet(other.abstractLabelSets)
    )

    override fun toString() = toString(transform = null)

    fun toString(transform: ((Int) -> String)?) = when {
        abstractLabelSets.isTop -> "TOP"
        abstractLabelSets.isBottom -> "BOTTOM"
        else -> requireNotNull(labelSets).joinToString(prefix = "{", postfix = "}") {
            it.toString(transform)
        }
    }

    private fun BitSet.toString(transform: ((Int) -> String)?): String {
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

    companion object {
        fun getBottom() = InformationFlowLabels(AbstractSet.getBottom<BitSet>())
        fun getTop() = InformationFlowLabels(AbstractSet.getTop<BitSet>())
    }
}
