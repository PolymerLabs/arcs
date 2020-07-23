package arcs.core.data.proto

import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PredicateProtoDecoderTest {
    @Test
    fun roundTrip_labelPredicate() {
        val predicate = Predicate.Label(InformationFlowLabel.SemanticTag("public"))
        assertThat(predicate.encode().decode()).isEqualTo(predicate)
    }

    @Test
    fun roundTrip_notPredicate() {
        val predicate = Predicate.Not(DUMMY_LABEL_PREDICATE1)
        assertThat(predicate.encode().decode()).isEqualTo(predicate)
    }

    @Test
    fun roundTrip_orPredicate() {
        val predicate = Predicate.Or(DUMMY_LABEL_PREDICATE1, DUMMY_LABEL_PREDICATE2)
        assertThat(predicate.encode().decode()).isEqualTo(predicate)
    }

    @Test
    fun roundTrip_andPredicate() {
        val predicate = Predicate.And(DUMMY_LABEL_PREDICATE1, DUMMY_LABEL_PREDICATE2)
        assertThat(predicate.encode().decode()).isEqualTo(predicate)
    }

    companion object {
        private val DUMMY_LABEL_PREDICATE1 = Predicate.Label(
            InformationFlowLabel.SemanticTag("dummy1")
        )
        private val DUMMY_LABEL_PREDICATE2 = Predicate.Label(
            InformationFlowLabel.SemanticTag("dummy2")
        )
    }
}
