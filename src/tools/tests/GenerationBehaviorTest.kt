package src.tools.tests

import arcs.core.data.RawEntity
import arcs.core.data.Schema
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class GenerationBehaviorTest {

    @Test
    fun variable_equality() {
        assertThat(Variable_H0.SCHEMA).isEqualTo(Schema.EMPTY)
        assertThat(Variable_H1.SCHEMA).isEqualTo(Schema.EMPTY)
        assertThat(Variable_H0).isEqualTo(Variable_H1)

        assertThat(Variable_H2.SCHEMA).isEqualTo(Variable_H3.SCHEMA)
        assertThat(Variable_H2).isEqualTo(Variable_H3)
    }

    @Test
    fun variable_unconstrainedCopy() {
        val indirectA = Variable_H0.deserialize(RawEntity(id = "~a"))
        val copyA = indirectA.copy()
        assertThat(copyA).isNotEqualTo(indirectA)
    }

    @Test
    fun variable_unconstrainedMutate() {
        val indirectA = Variable_H0.deserialize(RawEntity(id = "~a"))
        val mutateA = indirectA.mutate()
        assertThat(mutateA).isEqualTo(indirectA)
    }

    @Test
    fun variable_unconstrainedCopyMutate() {
        val indirectA = Variable_H0.deserialize(RawEntity(id = "~a"))
        val copyA = indirectA.copy()
        val mutateA = indirectA.mutate()
        assertThat(copyA).isNotEqualTo(mutateA)
    }

    @Test
    fun variable_constrainedEmptyCopy() {
        val indirectB = Variable_H2.deserialize(RawEntity(id = "~b"))
        val emptyCopyB = indirectB.copy()
        assertThat(emptyCopyB).isNotEqualTo(indirectB)
    }

    @Test
    fun variable_constrainedEmptyMutate() {
        val indirectB = Variable_H2.deserialize(RawEntity(id = "~b"))
        val emptyMutateB = indirectB.mutate()
        assertThat(emptyMutateB).isEqualTo(indirectB)
    }

    @Test
    fun variable_constrainedEmptyCopyMutate() {
        val indirectB = Variable_H2.deserialize(RawEntity(id = "~b"))
        val emptyCopyB = indirectB.copy()
        val emptyMutateB = indirectB.mutate()
        assertThat(emptyCopyB).isNotEqualTo(emptyMutateB)
    }

    @Test
    fun variable_constrainedCopyEmptyVsUpdate() {
        val indirectB = Variable_H2.deserialize(RawEntity(id = "~b"))
        val emptyCopyB = indirectB.copy()
        val updateCopyB = indirectB.copy(num = 2.0)
        assertThat(emptyCopyB).isNotEqualTo(updateCopyB)
    }

    @Test
    fun variable_constrainedMutateEmptyVsUpdate() {
        val indirectB = Variable_H2.deserialize(RawEntity(id = "~b"))
        val emptyMutateB = indirectB.mutate()
        val updateMutateB = indirectB.mutate(num = 2.0)
        assertThat(emptyMutateB).isNotEqualTo(updateMutateB)
    }

    @Test
    fun variable_constrainedUpdateCopyVsMutate() {
        val indirectB = Variable_H2.deserialize(RawEntity(id = "~b"))
        val updateCopyB = indirectB.copy(num = 2.0)
        val updateMutateB = indirectB.mutate(num = 2.0)
        assertThat(updateCopyB).isNotEqualTo(updateMutateB)
        assertThat(updateCopyB.num).isEqualTo(2.0)
        assertThat(updateMutateB.num).isEqualTo(2.0)
    }

    @Test
    fun variable_constrainedCopyUpdateVsOverwrite() {
        val indirectB = Variable_H2.deserialize(RawEntity(id = "~b"))
        val updateCopyB = indirectB.copy(num = 2.0)
        val overwriteCopyB = indirectB.copy(num = 4.0)
        assertThat(updateCopyB).isNotEqualTo(overwriteCopyB)
        assertThat(overwriteCopyB.num).isEqualTo(4.0)
    }

    @Test
    fun variable_constrainedMutateUpdateVsOverwrite() {
        val indirectB = Variable_H2.deserialize(RawEntity(id = "~b"))
        val updateMutateB = indirectB.mutate(num = 2.0)
        val overwriteMutateB = indirectB.mutate(num = 4.0)
        assertThat(updateMutateB).isNotEqualTo(overwriteMutateB)
        assertThat(overwriteMutateB.num).isEqualTo(4.0)
    }
}
