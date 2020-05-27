package arcs.core.analysis

import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import com.google.common.truth.Truth.assertThat
import java.util.BitSet
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PredicateUtilsTest {
    enum class Labels {
        A, B, C, D;

        val asPredicate: Predicate.Label
            get() = Predicate.Label(InformationFlowLabel.SemanticTag(name))
    }
    private val labels = enumValues<Labels>().map { it.name }
    private val indicesMap: Map<InformationFlowLabel, Int> = enumValues<Labels>().map {
        it.asPredicate.label to it.ordinal
    }.toMap()

    fun Predicate.asStringList(): List<String> {
        return asSetOfBitSets(indicesMap).map { bitset ->
            bitset.toString { bit ->
                labels[bit]
            }
        }
    }

    @Test
    fun prettyPrintBitSet() {
        val setAC = BitSet(labels.size).apply {
            set(Labels.A.ordinal)
            set(Labels.C.ordinal)
        }
        assertThat(setAC.toString { bit -> labels[bit] }).isEqualTo("{A, C}")
        assertThat(setAC.toString { _ -> "HAHA" }).isEqualTo("{HAHA, HAHA}")
    }

    @Test
    fun labelPredicate() {
        assertThat(Labels.A.asPredicate.asStringList())
            .containsExactly("{A}")
        assertThat(Labels.B.asPredicate.asStringList())
            .containsExactly("{B}")
    }

    @Test
    fun simpleAndPredicate() {
        val predicateAandB = Labels.A.asPredicate and Labels.B.asPredicate
        assertThat(predicateAandB.asStringList()).containsExactly("{A, B}")
        val predicateAandBandC =
            Labels.C.asPredicate and Labels.A.asPredicate and Labels.B.asPredicate
        assertThat(predicateAandBandC.asStringList()).containsExactly("{A, B, C}")
    }

    @Test
    fun simpleOrPredicate() {
        val predicateAorB = Labels.A.asPredicate or Labels.B.asPredicate
        assertThat((predicateAorB).asStringList()).containsExactly("{A}", "{B}")
        val predicateAorBorC =
            Labels.C.asPredicate or Labels.A.asPredicate or Labels.B.asPredicate
        assertThat(predicateAorBorC.asStringList()).containsExactly("{A}", "{B}", "{C}")
    }

    @Test
    fun simpleNotPredicate() {
        val notA = Predicate.Not(Labels.A.asPredicate)
        assertThat(notA.asStringList()).containsExactly("{B}", "{C}", "{D}")
    }

    @Test
    fun andOrPredicate() {
        // (A \/ B) /\ C
        val predicate_AorB_and_C = Labels.A.asPredicate
            .or(Labels.B.asPredicate)
            .and(Labels.C.asPredicate)
        assertThat(predicate_AorB_and_C.asStringList())
            .containsExactly("{A, C}", "{B, C}")
        // (A \/ B) /\ (C \/ D)
        val predicate_AorB_and_CorD =  Labels.A.asPredicate
            .or(Labels.B.asPredicate)
            .and(Labels.C.asPredicate.or(Labels.D.asPredicate))
        assertThat(predicate_AorB_and_CorD.asStringList())
            .containsExactly("{A, C}", "{A, D}", "{B, C}", "{B, D}")
    }

    @Test
    fun orAndPredicate() {
        // (A /\ B) \/ C
        val predicate_AandB_or_C = Labels.A.asPredicate
            .and(Labels.B.asPredicate)
            .or(Labels.C.asPredicate)
        assertThat(predicate_AandB_or_C.asStringList())
            .containsExactly("{A, B}", "{C}")
        // (A /\ B) \/ (C /\ D)
        val predicate_AorB_and_CorD =  Labels.A.asPredicate
            .and(Labels.B.asPredicate)
            .or(Labels.C.asPredicate.and(Labels.D.asPredicate))
        assertThat(predicate_AorB_and_CorD.asStringList())
            .containsExactly("{A, B}", "{C, D}")
    }

    @Test
    fun notOverAnd_throwsError() {
        val e = assertFailsWith<IllegalArgumentException> {
            // !(A /\ B)
            Labels.A.asPredicate
                .and(Labels.B.asPredicate)
                .not()
                .asStringList()
        }
        assertThat(e)
            .hasMessageThat()
            .isEqualTo("Not is only supported for label predicates when converting to bitsets!")
    }

    @Test
    fun notOverOr_throwsError() {
        val e = assertFailsWith<IllegalArgumentException> {
            // !(A \/ B)
            Labels.A.asPredicate
                .or(Labels.B.asPredicate)
                .not()
                .asStringList()
        }
        assertThat(e)
            .hasMessageThat()
            .isEqualTo("Not is only supported for label predicates when converting to bitsets!")
    }
}
