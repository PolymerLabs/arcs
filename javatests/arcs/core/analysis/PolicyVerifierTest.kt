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
    private val storeMap = mapOf("action" to "Action", "selection" to "Selection")
    private val manifestProto = loadManifestBinaryProto(getManifestProtoBinPath("policy-test"))
    private val recipes = manifestProto.decodeRecipes().associateBy { it.name!! }
    private val policy = manifestProto.policiesList.single { it.name == "TestPolicy" }.decode()
    private val verifier = PolicyVerifier(PolicyOptions(storeMap))

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
    fun accessingRestrictedFieldsIsAllowedIfNotEgressed() {
        assertThat(
            verifier.verifyPolicy(
                recipes.getValue("AccessRestrictedFieldsNoEgress"),
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
    fun invalidEgressesAreDisallowed() {
        assertFailsWith<PolicyViolation.InvalidEgressTypeForParticles> {
            verifier.verifyPolicy(
                recipes.getValue("InvalidEgressParticles"),
                policy
            )
        }.also {
            assertThat(it).hasMessageThat().contains(
                "Policy TestPolicy violated: Invalid egress types found for particles: " +
                    "{ParticleWithMissingEgressType (null), " +
                    "ParticleWithWrongEgressType (SomeOtherEgress)}. " +
                    "Egress type allowed by policy: TestEgressType."
            )
        }
    }

    @Test
    fun policyWithNoEgressIsAllowed() {
        val testVerifier = PolicyVerifier(PolicyOptions(storeMap))
        assertThat(
            testVerifier.verifyPolicy(
                recipes.getValue("NoEgressParticles"),
                policy
            )
        ).isTrue()
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

    @Test
    fun missingPolicyAnnotationIsDisallowed() {
        assertFailsWith<PolicyViolation.MissingPolicyAnnotation> {
            verifier.verifyPolicy(recipes.getValue("MissingPolicyAnnotation"), policy)
        }
    }

    @Test
    fun mismatchedPolicyNameIsDisallowed() {
        assertFailsWith<PolicyViolation.MismatchedPolicyName> {
            verifier.verifyPolicy(recipes.getValue("DifferentPolicyName"), policy)
        }
    }

    /** Returns the path for the manifest proto binary file for the test. */
    private fun getManifestProtoBinPath(test: String): String {
        return "javatests/arcs/core/analysis/testdata/$test.pb.bin"
    }
}
