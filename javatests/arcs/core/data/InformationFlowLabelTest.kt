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

import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.InformationFlowLabel.SemanticTag
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class InformationFlowLabelTest {
    enum class Labels {
        A, B, C, D;

        val asPredicate: Predicate.Label
            get() = Predicate.Label(InformationFlowLabel.SemanticTag(name))
    }
    private val labels = enumValues<Labels>().map { it.name }
    private val indicesMap: Map<InformationFlowLabel, Int> = enumValues<Labels>().map {
        it.asPredicate.label to it.ordinal
    }.toMap()

    @Test
    fun prettyPrintSemanticTag() {
        assertThat("${SemanticTag("packageName")}").isEqualTo("packageName")
        assertThat("${SemanticTag("coarseLocation")}").isEqualTo("coarseLocation")
    }

    @Test
    fun andConstructor() {
        assertThat(Labels.A.asPredicate and Labels.B.asPredicate)
            .isEqualTo(Predicate.And(Labels.A.asPredicate, Labels.B.asPredicate))
    }

    @Test
    fun orConstructor() {
        assertThat(Labels.A.asPredicate or Labels.B.asPredicate)
            .isEqualTo(Predicate.Or(Labels.A.asPredicate, Labels.B.asPredicate))
    }

    @Test
    fun notConstructor() {
        assertThat(Labels.A.asPredicate.not())
            .isEqualTo(Predicate.Not(Labels.A.asPredicate))
        assertThat((Labels.A.asPredicate and Labels.B.asPredicate).not())
            .isEqualTo(Predicate.Not(Predicate.And(Labels.A.asPredicate, Labels.B.asPredicate)))
    }

    @Test
    fun prettyPrintLabelPredicate() {
        assertThat("${Labels.A.asPredicate}").isEqualTo("A")
        assertThat("${Labels.B.asPredicate}").isEqualTo("B")
    }

    @Test
    fun prettyPrintNotPredicate() {
        assertThat("${Labels.A.asPredicate.not()}").isEqualTo("not A")
        assertThat("${Labels.D.asPredicate.not()}").isEqualTo("not D")
    }

    @Test
    fun prettyPrintAndPredicate() {
        val AandB = Labels.A.asPredicate and Labels.B.asPredicate
        assertThat("$AandB").isEqualTo("(A and B)")

        val AandBandNotC = AandB and Labels.C.asPredicate.not()
        assertThat("$AandBandNotC").isEqualTo("((A and B) and not C)")

        val AandBandNotCandD = AandB and (Labels.C.asPredicate.not() and Labels.D.asPredicate)
        assertThat("$AandBandNotCandD").isEqualTo("((A and B) and (not C and D))")
    }

    @Test
    fun prettyPrintOrPredicate() {
        val AorB = Labels.A.asPredicate or Labels.B.asPredicate
        assertThat("$AorB").isEqualTo("(A or B)")

        val AorBorNotC = AorB or Labels.C.asPredicate.not()
        assertThat("$AorBorNotC").isEqualTo("((A or B) or not C)")

        val AorBorNotCorD = AorB or (Labels.C.asPredicate.not() or Labels.D.asPredicate)
        assertThat("$AorBorNotCorD").isEqualTo("((A or B) or (not C or D))")
    }
}
