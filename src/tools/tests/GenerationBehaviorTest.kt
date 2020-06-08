package src.tools.tests

import arcs.core.common.ReferenceId
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
    fun variable_copying() {
        val indirectA = Variable_H0.deserialize(RawEntity(id = "~a"))
        val copyA = indirectA.copy()
        val mutateA = indirectA.mutate()
        assertThat(copyA).isNotEqualTo(indirectA)
        assertThat(copyA).isNotEqualTo(mutateA)
        assertThat(mutateA).isEqualTo(indirectA)

        val indirectB = Variable_H2.deserialize(RawEntity(id = "~b"))
        val emptyCopyB = indirectB.copy()
        val overwriteCopyB = indirectB.copy(num = 2.0)
        val emptyMutateB = indirectB.mutate()
        val overwriteMutateB = indirectB.mutate(num = 2.0)

        assertThat(emptyCopyB).isNotEqualTo(indirectB)
        assertThat(emptyCopyB).isNotEqualTo(emptyMutateB)
        assertThat(emptyMutateB).isEqualTo(indirectB)
        assertThat(emptyCopyB).isNotEqualTo(overwriteCopyB)
        assertThat(emptyMutateB).isNotEqualTo(overwriteMutateB)
        assertThat(overwriteCopyB).isNotEqualTo(overwriteMutateB)
        assertThat(overwriteCopyB.num).isEqualTo(2.0)
        assertThat(overwriteMutateB.num).isEqualTo(2.0)
    }
}
