package arcs.core.analysis

import com.google.common.truth.Truth.assertThat
import java.util.BitSet
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class InformationFlowLabelsTest {
    enum class Labels { A, B, C }
    private val labels = enumValues<Labels>().map { it.name }
    private val bottom = InformationFlowLabels.getBottom()
    private val top = InformationFlowLabels.getTop()
    private val setAB = BitSet(labels.size).apply {
            set(Labels.A.ordinal)
            set(Labels.B.ordinal)
    }
    private val setAC = BitSet(labels.size).apply {
            set(Labels.A.ordinal)
            set(Labels.C.ordinal)
    }
    val setOfAB = InformationFlowLabels(setOf(setAB))
    val setOfAC = InformationFlowLabels(setOf(setAC))
    val setOfABandAC = InformationFlowLabels(setOf(setAB, setAC))

    @Test
    fun bottomConstruction() {
        assertThat(bottom.isBottom).isTrue()
        assertThat(bottom.isTop).isFalse()
        assertThat(bottom.setOfLabelSets).isNull()
    }

    @Test
    fun topConstruction() {
        assertThat(top.isBottom).isFalse()
        assertThat(top.isTop).isTrue()
        assertThat(top.setOfLabelSets).isNull()
    }

    @Test
    fun valueConstruction() {
        assertThat(setOfABandAC.isBottom).isFalse()
        assertThat(setOfABandAC.isTop).isFalse()
        assertThat(requireNotNull(setOfABandAC.setOfLabelSets)).containsExactly(setAB, setAC)
    }

    @Test
    fun prettyPrint() {
        assertThat("$top").isEqualTo("TOP")
        assertThat("$bottom").isEqualTo("BOTTOM")
        assertThat("$setOfAB").isEqualTo("{{0, 1}}")
        assertThat("$setOfABandAC").isEqualTo("{{0, 1}, {0, 2}}")
    }

    @Test
    fun prettyPrintCustomizeIndices() {
        assertThat(top.toString { x -> labels[x] }).isEqualTo("TOP")
        assertThat(bottom.toString { x -> labels[x] }).isEqualTo("BOTTOM")
        assertThat(setOfAB.toString { x -> labels[x] }).isEqualTo("{{A, B}}")
        assertThat(setOfABandAC.toString { x -> labels[x] }).isEqualTo("{{A, B}, {A, C}}")
    }

    @Test
    fun isEquivalentTo_bottom() {
        with(bottom) {
            assertThat(isEquivalentTo(bottom)).isTrue()
            assertThat(isEquivalentTo(top)).isFalse()
            assertThat(isEquivalentTo(setOfABandAC)).isFalse()
        }
    }

    @Test
    fun isEquivalentTo_top() {
        with(top) {
            assertThat(isEquivalentTo(bottom)).isFalse()
            assertThat(isEquivalentTo(top)).isTrue()
            assertThat(isEquivalentTo(setOfABandAC)).isFalse()
        }
    }

    @Test
    fun isEquivalentTo_setOfABandAC() {
        with(setOfABandAC) {
            assertThat(isEquivalentTo(bottom)).isFalse()
            assertThat(isEquivalentTo(top)).isFalse()
            assertThat(isEquivalentTo(setOfABandAC)).isTrue()
        }
    }

    @Test
    fun meet_bottom() {
        assertThat(bottom meet bottom).isEqualTo(bottom)
        assertThat(bottom meet top).isEqualTo(bottom)
        assertThat(bottom meet setOfABandAC).isEqualTo(bottom)
    }

    @Test
    fun meet_top() {
        assertThat(top meet bottom).isEqualTo(bottom)
        assertThat(top meet top).isEqualTo(top)
        assertThat(top meet setOfABandAC).isEqualTo(setOfABandAC)
    }

    @Test
    fun meet_value() {
        assertThat(setOfABandAC meet bottom).isEqualTo(bottom)
        assertThat(setOfABandAC meet top).isEqualTo(setOfABandAC)
        assertThat(setOfABandAC meet setOfABandAC).isEqualTo(setOfABandAC)

        // {AB} meet {AC} is empty.
        assertThat(setOfAB meet setOfAC).isEqualTo(InformationFlowLabels(emptySet()))

        // {AB, AC} meet {AB} is {AB}
        assertThat(setOfABandAC meet setOfAB).isEqualTo(setOfAB)
        assertThat(setOfAB meet setOfABandAC).isEqualTo(setOfAB)
    }

    @Test
    fun join_bottom() {
        assertThat(bottom join bottom).isEqualTo(bottom)
        assertThat(bottom join top).isEqualTo(top)
        assertThat(bottom join setOfABandAC).isEqualTo(setOfABandAC)
    }

    @Test
    fun join_top() {
        assertThat(top join bottom).isEqualTo(top)
        assertThat(top join top).isEqualTo(top)
        assertThat(top join setOfABandAC).isEqualTo(top)
    }

    @Test
    fun join_setOfABandAC() {
        assertThat(setOfABandAC join bottom).isEqualTo(setOfABandAC)
        assertThat(setOfABandAC join top).isEqualTo(top)
        assertThat(setOfABandAC join setOfABandAC).isEqualTo(setOfABandAC)

        // {AB} join {AC} is {AB, AC}
        assertThat(setOfAB join setOfAC).isEqualTo(setOfABandAC)

        // {AB, AC} join {AB} is {AB, AC}
        assertThat(setOfABandAC join setOfAB).isEqualTo(setOfABandAC)
        assertThat(setOfAB join setOfABandAC).isEqualTo(setOfABandAC)
    }

}
