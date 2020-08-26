package arcs.core.analysis

import arcs.core.data.proto.decodeRecipes
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
    private val manifestProto = loadManifestBinaryProto(getManifestProtoBinPath("policy_test"))
    private val recipes = manifestProto.decodeRecipes().associateBy { it.name!! }
    private val policy = manifestProto.policiesList.single { it.name == "TestPolicy" }.decode()
    private val verifier = PolicyVerifier()

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
    fun mappedHandleOfDifferentTypeIsDisallowed() {
        assertFailsWith<PolicyViolation.ChecksViolated> {
            verifier.verifyPolicy(
                recipes.getValue("MappedHandleOfDifferentType"),
                policy
            )
        }
    }

    @Test
    fun ingressParticleOfDifferentTypeIsDisallowed() {
        assertFailsWith<PolicyViolation.ChecksViolated> {
            verifier.verifyPolicy(
                recipes.getValue("IngressParticleOfDifferentType"),
                policy
            )
        }
    }

    @Test
    fun unusedIngressPointsOfDifferentTypesAreAllowed() {
        assertThat(
            verifier.verifyPolicy(
                recipes.getValue("UnusedIngressPointsOfDifferentType"),
                policy
            )
        ).isTrue()
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
        assertThat(
            verifier.verifyPolicy(
                recipes.getValue("NoEgressParticles"),
                policy
            )
        ).isTrue()
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
        return "javatests/arcs/core/analysis/testdata/$test.binarypb"
    }
}
