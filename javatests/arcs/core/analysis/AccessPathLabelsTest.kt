package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.TypeVariable
import com.google.common.truth.Subject
import com.google.common.truth.Truth.assertThat
import java.util.BitSet
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class AccessPathLabelsTest {
    private val bottom = AccessPathLabels.getBottom()
    private val top = AccessPathLabels.getTop()
    // Information Flow Labels
    //
    enum class Labels { A, B, C }
    private val labels = enumValues<Labels>().map { it.name }
    private val setA = BitSet(labels.size).apply { set(Labels.A.ordinal) }
    private val setAB = BitSet(labels.size).apply {
        set(Labels.A.ordinal)
        set(Labels.B.ordinal)
    }
    private val setAC = BitSet(labels.size).apply {
        set(Labels.A.ordinal)
        set(Labels.C.ordinal)
    }
    private val setOfA = InformationFlowLabels(setOf(setA))
    private val setOfAorAB = InformationFlowLabels(setOf(setA, setAB))
    private val setOfAB = InformationFlowLabels(setOf(setAB))
    private val setOfAC = InformationFlowLabels(setOf(setAC))
    private val setOfABorAC = InformationFlowLabels(setOf(setAB, setAC))
    private val emptyLabels = InformationFlowLabels(setOf(BitSet(labels.size)))
    // AccessPaths
    //
    private val particleName = "TestParticle"
    private val inputSpec = HandleConnectionSpec("input", HandleMode.Read, TypeVariable("input"))
    private val outputSpec =
        HandleConnectionSpec("output", HandleMode.Write, TypeVariable("output"))
    private val inputName = AccessPath(
        particleName,
        inputSpec,
        listOf(AccessPath.Selector.Field("name"))
    )
    private val inputAge = AccessPath(
        particleName,
        inputSpec,
        listOf(AccessPath.Selector.Field("age"))
    )
    private val outputName = AccessPath(
        particleName,
        outputSpec,
        listOf(AccessPath.Selector.Field("name"))
    )
    private val outputAge = AccessPath(
        particleName,
        outputSpec,
        listOf(AccessPath.Selector.Field("age"))
    )
    // AccessPathLabels values.
    //
    // input.age: { () }
    private val inputAgeIsNone = AccessPathLabels.makeValue(mapOf(inputAge to emptyLabels))
    // input.age: { (A) }
    private val inputAgeIsA = AccessPathLabels.makeValue(mapOf(inputAge to setOfA))
    // input.age: { (A,B) }
    private val inputAgeIsAB = AccessPathLabels.makeValue(mapOf(inputAge to setOfAB))
    // input.age: { (A,C) }
    private val inputAgeIsAC = AccessPathLabels.makeValue(mapOf(inputAge to setOfAC))
    // input.age: { (A,B), (A,C) }
    private val inputAgeIsABorAC = AccessPathLabels.makeValue(mapOf(inputAge to setOfABorAC))
    // input.name -> { (A,B), (A,C) }
    // input.age -> { (A,B) }
    private val inputNameIsABorACAgeIsAB = AccessPathLabels.makeValue(
        mapOf(inputName to setOfABorAC, inputAge to setOfAB)
    )
    // input.name -> { (A,B), (A,C) }
    // input.age -> { (A,B), (A,C) }
    private val inputNameIsABorACAgeIsABorAC = AccessPathLabels.makeValue(
        mapOf(inputName to setOfABorAC, inputAge to setOfABorAC)
    )
    // input.name -> { (A,B) }
    // input.age -> { (A,B) }
    private val inputNameIsABAgeIsAB = AccessPathLabels.makeValue(
        mapOf(inputName to setOfAB, inputAge to setOfAB)
    )
    // input.name -> { () }
    // input.age -> { (A,B) }
    private val inputNameIsNoneAgeIsAB = AccessPathLabels.makeValue(
        mapOf(inputName to emptyLabels, inputAge to setOfAB)
    )

    @Test
    fun bottomConstruction() {
        assertThat(bottom.isBottom).isTrue()
        assertThat(bottom.isTop).isFalse()
        assertThat(bottom.accessPathLabels).isNull()
    }

    @Test
    fun topConstruction() {
        assertThat(top.isBottom).isFalse()
        assertThat(top.isTop).isTrue()
        assertThat(top.accessPathLabels).isNull()
    }

    @Test
    fun valueConstruction() {
        assertThat(inputAgeIsAB.isBottom).isFalse()
        assertThat(inputAgeIsAB.isTop).isFalse()
        assertThat(inputAgeIsAB.accessPathLabels).isEqualTo(mapOf(inputAge to setOfAB))
    }

    @Test
    fun valueConstruction_detectsBottom() {
        assertThat(
            AccessPathLabels.makeValue(
                mapOf(
                    inputAge to InformationFlowLabels.getBottom(),
                    inputName to setOfABorAC
                )
            )
        ).isEqualTo(bottom)
        assertThat(
            AccessPathLabels.makeValue(
                mapOf(
                    inputAge to InformationFlowLabels(setOf()),
                    inputName to setOfABorAC
                )
            )
        ).isEqualTo(bottom)
    }

    @Test
    fun prettyPrint() {
        assertThat("$top").isEqualTo("TOP")
        assertThat("$bottom").isEqualTo("BOTTOM")
        assertThat("$inputAgeIsAB").isEqualTo(
            "hcs:TestParticle.input.age -> {{0, 1}}"
        )
        assertThat("$inputNameIsABorACAgeIsAB".lines()).containsExactly(
            "hcs:TestParticle.input.age -> {{0, 1}}",
            "hcs:TestParticle.input.name -> {{0, 1}, {0, 2}}"
        )
    }

    @Test
    fun prettyPrintCustomizeIndices() {
        assertThat(top.toString { x -> labels[x] }).isEqualTo("TOP")
        assertThat(bottom.toString { x -> labels[x] }).isEqualTo("BOTTOM")
        assertThat(inputAgeIsAB.toString { x -> labels[x] }).isEqualTo(
            "hcs:TestParticle.input.age -> {{A, B}}"
        )
        assertThat(
            (inputNameIsABorACAgeIsAB.toString { x -> labels[x] }).lines()
        ).containsExactly(
            "hcs:TestParticle.input.name -> {{A, B}, {A, C}}",
            "hcs:TestParticle.input.age -> {{A, B}}"
        )
    }

    @Test
    fun prettyPrintWithPrefix() {
        assertThat(top.toString("|  ") { x -> labels[x] }).isEqualTo("|  TOP")
        assertThat(bottom.toString("~~~") { x -> labels[x] }).isEqualTo("~~~BOTTOM")
        assertThat(inputAgeIsAB.toString("| ") { x -> labels[x] }).isEqualTo(
            "| hcs:TestParticle.input.age -> {{A, B}}"
        )
        assertThat(
            (inputNameIsABorACAgeIsAB.toString("| ") { x -> labels[x] }).lines()
        ).containsExactly(
            "| hcs:TestParticle.input.name -> {{A, B}, {A, C}}",
            "| hcs:TestParticle.input.age -> {{A, B}}"
        )
    }

    @Test
    fun isEquivalentTo_bottom() {
        with(bottom) {
            assertThat(isEquivalentTo(bottom)).isTrue()
            assertThat(isEquivalentTo(top)).isFalse()
            assertThat(isEquivalentTo(inputAgeIsAB)).isFalse()
            assertThat(isEquivalentTo(inputNameIsABorACAgeIsAB)).isFalse()
        }
    }

    @Test
    fun isEquivalentTo_top() {
        with(top) {
            assertThat(isEquivalentTo(bottom)).isFalse()
            assertThat(isEquivalentTo(top)).isTrue()
            assertThat(isEquivalentTo(inputAgeIsAB)).isFalse()
            assertThat(isEquivalentTo(inputNameIsABorACAgeIsAB)).isFalse()
        }
    }

    @Test
    fun isEquivalentTo_inputAgeIsAB() {
        with(inputAgeIsAB) {
            assertThat(isEquivalentTo(bottom)).isFalse()
            assertThat(isEquivalentTo(top)).isFalse()
            assertThat(isEquivalentTo(inputAgeIsAB)).isTrue()
            assertThat(isEquivalentTo(inputNameIsABorACAgeIsAB)).isFalse()
        }
    }

    @Test
    fun isEquivalentTo_inputNameIsABorACAgeIsAB() {
        with(inputNameIsABorACAgeIsAB) {
            assertThat(isEquivalentTo(bottom)).isFalse()
            assertThat(isEquivalentTo(top)).isFalse()
            assertThat(isEquivalentTo(inputAgeIsAB)).isFalse()
            assertThat(isEquivalentTo(inputNameIsABorACAgeIsAB)).isTrue()
        }
    }

    @Test
    fun meet_bottom() {
        assertThat(bottom meet bottom).isEqualTo(bottom)
        assertThat(bottom meet top).isEqualTo(bottom)
        assertThat(bottom meet inputAgeIsAB).isEqualTo(bottom)
        assertThat(bottom meet inputNameIsABorACAgeIsAB).isEqualTo(bottom)
    }

    @Test
    fun meet_top() {
        assertThat(top meet bottom).isEqualTo(bottom)
        assertThat(top meet top).isEqualTo(top)
        assertThat(top meet inputAgeIsAB).isEqualTo(inputAgeIsAB)
        assertThat(top meet inputNameIsABorACAgeIsAB).isEqualTo(inputNameIsABorACAgeIsAB)
    }

    @Test
    fun meet_inputAgeIsAB() {
        assertThat(inputAgeIsAB meet bottom).isEqualTo(bottom)
        assertThat(inputAgeIsAB meet top).isEqualTo(inputAgeIsAB)
        assertThat(inputAgeIsAB meet inputAgeIsAB).isEqualTo(inputAgeIsAB)

        // (x -> {AB}) meet (x -> {AC}) is BOTTOM
        assertThat(inputAgeIsAB meet inputAgeIsAC).isEqualTo(bottom)
        assertThat(inputAgeIsAC meet inputAgeIsAB).isEqualTo(bottom)

        // (x -> {AB, AC}) meet  (x -> {AB}) is x -> {{AB}}
        assertThat(inputAgeIsAB meet inputAgeIsABorAC).isEqualTo(inputAgeIsAB)
        assertThat(inputAgeIsABorAC meet inputAgeIsAB).isEqualTo(inputAgeIsAB)
    }

    @Test
    fun meet_multipleAccessPaths_allPresent() {
        // `Name` and `Age` are present in both maps.
        assertThat(inputNameIsABorACAgeIsAB meet inputNameIsABAgeIsAB)
            .isEqualTo(inputNameIsABAgeIsAB)
        assertThat(inputNameIsABAgeIsAB meet inputNameIsABorACAgeIsAB)
            .isEqualTo(inputNameIsABAgeIsAB)
    }

    @Test
    fun meet_multipleAccessPaths_somePresent() {
        // Name is not present in one map.
        assertThat(inputNameIsABorACAgeIsAB meet inputAgeIsABorAC)
            .isEqualTo(inputAgeIsAB)
        assertThat(inputAgeIsABorAC meet inputNameIsABorACAgeIsAB)
            .isEqualTo(inputAgeIsAB)
    }

    @Test
    fun join_bottom() {
        assertThat(bottom join bottom).isEqualTo(bottom)
        assertThat(bottom join top).isEqualTo(top)
        assertThat(bottom join inputAgeIsAB).isEqualTo(inputAgeIsAB)
        assertThat(bottom join inputNameIsABorACAgeIsAB).isEqualTo(inputNameIsABorACAgeIsAB)
    }

    @Test
    fun join_top() {
        assertThat(top join bottom).isEqualTo(top)
        assertThat(top join top).isEqualTo(top)
        assertThat(top join inputAgeIsAB).isEqualTo(top)
        assertThat(top join inputNameIsABorACAgeIsAB).isEqualTo(top)
    }

    @Test
    fun join_inputAgeIsAB() {
        assertThat(inputAgeIsAB join bottom).isEqualTo(inputAgeIsAB)
        assertThat(inputAgeIsAB join top).isEqualTo(top)
        assertThat(inputAgeIsAB join inputAgeIsAB).isEqualTo(inputAgeIsAB)

        // (x -> {AB}) join (x -> {AC) is x -> {AB, AC}
        assertThat(inputAgeIsAB join inputAgeIsAC).isEqualTo(inputAgeIsABorAC)
        assertThat(inputAgeIsAC join inputAgeIsAB).isEqualTo(inputAgeIsABorAC)

        // (x -> {AB, AC}) join  (x -> {AB}) is x -> {AB, AC}
        assertThat(inputAgeIsAB join inputAgeIsABorAC).isEqualTo(inputAgeIsABorAC)
        assertThat(inputAgeIsABorAC join inputAgeIsAB).isEqualTo(inputAgeIsABorAC)

        // (x -> {AB, AC}) join  (x -> {AB}) is x -> {AB, AC}
        assertThat(inputAgeIsAB join inputAgeIsABorAC).isEqualTo(inputAgeIsABorAC)
        assertThat(inputAgeIsABorAC join inputAgeIsAB).isEqualTo(inputAgeIsABorAC)
    }

    @Test
    fun join_multipleAccessPaths_allPresent() {
        // `Name` and `Age` are present in both maps.
        assertThat(inputNameIsABorACAgeIsAB join inputNameIsABAgeIsAB)
            .isEqualTo(inputNameIsABorACAgeIsAB)
        assertThat(inputNameIsABAgeIsAB join inputNameIsABorACAgeIsAB)
            .isEqualTo(inputNameIsABorACAgeIsAB)
    }

    @Test
    fun join_multipleAccessPaths_somePresent() {
        // Name is not present in one map.
        assertThat(inputNameIsABorACAgeIsAB join inputAgeIsABorAC)
            .isEqualTo(inputNameIsABorACAgeIsABorAC)
        assertThat(inputAgeIsABorAC join inputNameIsABorACAgeIsAB)
            .isEqualTo(inputNameIsABorACAgeIsABorAC)
    }
}
