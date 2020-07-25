package arcs.core.policy.proto

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.InformationFlowLabel.SemanticTag
import arcs.core.policy.EgressType
import arcs.core.policy.Policy
import arcs.core.policy.PolicyConstraints
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
                egressType = EgressType.LOGGING
            ),
            egressCheck = Predicate.Label(SemanticTag("public")),
            storeClaims = mapOf(
                "store_id_1" to listOf(
                    Claim.Assume(
                        AccessPath(AccessPath.Root.Store("store_id_1")),
                        Predicate.Label(SemanticTag("public"))
                    )
                ),
                "store_id_2" to listOf(
                    Claim.Assume(
                        AccessPath(AccessPath.Root.Store("store_id_2")),
                        Predicate.Label(SemanticTag("private"))
                    )
                )
            )
        )

        assertThat(constraints.encode().decode(emptyMap())).isEqualTo(constraints)
    }
}
