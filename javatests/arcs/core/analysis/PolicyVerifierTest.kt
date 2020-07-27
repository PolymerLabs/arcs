package arcs.core.analysis

import arcs.core.data.proto.decodeRecipes
import arcs.core.policy.PolicyOptions
import arcs.core.policy.PolicyViolation
import arcs.core.policy.proto.decode
import arcs.core.testutil.protoloader.loadManifestBinaryProto
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PolicyVerifierTest {
    // Test context.
    val storeMap = mapOf("action" to "Action", "selection" to "Selection")
    val manifestProto = loadManifestBinaryProto(getManifestProtoBinPath("policy-test"))
    val recipes = manifestProto.decodeRecipes().associateBy { it.name!! }
    val policy = manifestProto.policiesList.map { it.decode() }.single()
    val verifier = PolicyVerifier(PolicyOptions(storeMap))

    @Test
    fun egressingUnrestrictedFieldsIsAllowed() {
        assertThat(
            verifier.verifyPolicy(
                recipes.getValue("EgressUnrestrictedFields"),
                policy
            )
        ).isTrue()
    }

    @Test
    fun egressingRedactedFieldsIsAllowed() {
        assertThat(
            verifier.verifyPolicy(
                recipes.getValue("EgressRedactedField"),
                policy
            )
        ).isTrue()
    }

    @Test
    fun egressingRestrictedFieldsIsDisallowed() {
        assertFailsWith<PolicyViolation.ChecksViolated> {
            verifier.verifyPolicy(
                recipes.getValue("EgressRestrictedFields"),
                policy
            )
        }
    }

    @Test
    fun egressingJoinOnlyFieldsIsDisallowed() {
        assertFailsWith<PolicyViolation.ChecksViolated> {
            verifier.verifyPolicy(
                recipes.getValue("EgressJoinOnlyField"),
                policy
            )
        }
    }

    @Test
    fun egressingUnredactedFieldsIsDisallowed() {
        assertFailsWith<PolicyViolation.ChecksViolated> {
            verifier.verifyPolicy(
                recipes.getValue("EgressUnredactedField"),
                policy
            )
        }
    }

    @Test
    fun multipleEgressIsDisallowed() {
        assertFailsWith<PolicyViolation.MultipleEgressParticles> {
            verifier.verifyPolicy(
                recipes.getValue("MultipleEgressParticles"),
                policy
            )
        }.also {
            assertThat(it).hasMessageThat()
                .contains("Multiple egress particles named Egress_TestPolicy found for policy")
        }
    }

    @Test
    fun invalidEgressIsDisallowed() {
        assertFailsWith<PolicyViolation.InvalidEgressParticle> {
            verifier.verifyPolicy(
                recipes.getValue("InvalidEgressParticles"),
                policy
            )
        }.also {
            assertThat(it).hasMessageThat()
                .contains(
                    "Egress particle allowed by policy is Egress_TestPolicy but " +
                    "found: Egress_AnotherPolicy"
                )
        }
    }

    @Test
    fun missingStoreIsDetected() {
        val incompleteStoreMap = mapOf("action" to "Action")
        val testVerifier = PolicyVerifier(PolicyOptions(incompleteStoreMap))
        assertFailsWith<PolicyViolation.NoStoreForPolicyTarget> {
            testVerifier.verifyPolicy(
                recipes.getValue("InvalidEgressParticles"),
                policy
            )
        }.also {
            assertThat(it).hasMessageThat()
                .contains("No store found for policy target `Selection`")
        }
    }

    /** Returns the path for the manifest proto binary file for the test. */
    private fun getManifestProtoBinPath(test: String): String {
        return "javatests/arcs/core/analysis/testdata/$test.pb.bin"
    }

    companion object {
        val INGRESS_PREFIX = "// #Ingress:"
        val FAIL_PREFIX = "// #Fail:"
        val OK_PREFIX = "// #OK"
    }
}
