package arcs.core.policy.proto

import arcs.core.data.AccessPath
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.InformationFlowLabel.SemanticTag
import arcs.core.policy.Policy
import arcs.core.policy.PolicyConstraints
import arcs.core.policy.SelectorClaim
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PolicyConstraintsProtoTest {
    @Test
    fun roundTrip() {
        val constraints = PolicyConstraints(
            policy = Policy(
                name = "MyPolicy",
                egressType = "Logging"
            ),
            egressCheck = Predicate.Label(SemanticTag("public")),
            claims = mapOf(
                "schema_name_1" to listOf(
                    SelectorClaim(
                        selectors = listOf(AccessPath.Selector.Field("a")),
                        predicate = Predicate.Label(SemanticTag("public"))
                    )
                ),
                "schema_name_2" to listOf(
                    SelectorClaim(
                        selectors = listOf(AccessPath.Selector.Field("b")),
                        predicate = Predicate.Label(SemanticTag("private"))
                    )
                )
            )
        )

        assertThat(constraints.encode().decode()).isEqualTo(constraints)
    }
}
