package arcs.core.policy

import arcs.core.data.AccessPath
import arcs.core.data.Claim
import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.policy.proto.decode
import arcs.core.testutil.protoloader.loadManifestBinaryProto
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PolicyConstraintsTest {
    // Loaded from binary proto, maps all keyed by name.
    private val policies: Map<String, Policy> = loadManifestBinaryProto(
        "javatests/arcs/core/policy/PolicyTranslationTestData.pb.bin"
    ).policiesList
        .map { it.decode() }
        .associateBy { it.name }

    @Test
    fun applyPolicy_egressCheck_withoutRedactionLabels() {
        val policy = BLANK_POLICY.copy(name = "SingleInput")

        val result = translatePolicy(policy, EMPTY_OPTIONS)

        assertThat(result.egressCheck).isEqualTo(labelPredicate("allowedForEgress"))
    }

    @Test
    fun applyPolicy_egressCheck_withRedactionLabels() {
        val policy = policies.getValue("FooRedactions")

        val result = translatePolicy(
            policy,
            PolicyOptions(mapOf("my_store_id" to "Foo"))
        )

        assertThat(result.egressCheck).isEqualTo(
            Predicate.or(
                labelPredicate("allowedForEgress"),
                labelPredicate("allowedForEgress_redaction1") and labelPredicate("redaction1"),
                labelPredicate("allowedForEgress_redaction2") and labelPredicate("redaction2"),
                labelPredicate("allowedForEgress_redaction3") and labelPredicate("redaction3")
            )
        )
    }

    @Test
    fun applyPolicy_egressCheck_ignoresWriteOnlyConnections() {
        val policy = BLANK_POLICY.copy(name = "SingleOutput")

        val result = translatePolicy(policy, EMPTY_OPTIONS)

        assertThat(result.egressCheck).isEqualTo(labelPredicate("allowedForEgress"))
    }

    @Test
    fun applyPolicy_storeClaims_fieldClaim() {
        val policy = policies.getValue("FooRedactions")
        val storeMap = mapOf("my_store_id" to "Foo")

        val result = translatePolicy(policy, PolicyOptions(storeMap))

        val store = AccessPath.Root.Store("my_store_id")
        assertThat(result.storeClaims).containsExactly(
            "my_store_id",
            listOf(
                Claim.Assume(
                    AccessPath(store, selectors("a")),
                    labelPredicate("allowedForEgress_redaction1")
                ),
                Claim.Assume(
                    AccessPath(store, selectors("b")),
                    labelPredicate("allowedForEgress_redaction2")
                ),
                Claim.Assume(
                    AccessPath(store, selectors("c")),
                    labelPredicate("allowedForEgress_redaction3")
                )
            )
        )
    }

    @Test
    fun applyPolicy_storeClaims_fieldsNotInPolicyDoNotHaveClaims() {
        val policy = policies.getValue("SingleFooRedaction")
        val storeMap = mapOf("my_store_id" to "Foo")

        val result = translatePolicy(policy, PolicyOptions(storeMap))

        val store = AccessPath.Root.Store("my_store_id")
        assertThat(result.storeClaims).containsExactly(
            "my_store_id",
            listOf(
                Claim.Assume(
                    AccessPath(store, selectors("a")),
                    labelPredicate("allowedForEgress_redaction1")
                )
            )
        )
    }

    @Test
    fun applyPolicy_storeClaims_missingFromStoresMap() {
        val policy = policies.getValue("FooRedactions")
        val storeMap = mapOf("some_other_store" to "Bar")

        assertFailsWith<PolicyViolation.NoStoreForPolicyTarget> {
            translatePolicy(policy, PolicyOptions(storeMap))
        }
    }

    @Test
    fun applyPolicy_storeClaims_emptyPolicy() {
        val storeMap = mapOf("my_store_id" to "Foo")

        val result = translatePolicy(BLANK_POLICY, PolicyOptions(storeMap))

        assertThat(result.storeClaims).isEmpty()
    }

    @Test
    fun applyPolicy_storeClaims_joinUsageType() {
        val policy = policies.getValue("FooJoinPolicy")
        val storeMap = mapOf("my_store_id" to "Foo")

        val result = translatePolicy(policy, PolicyOptions(storeMap))

        assertThat(result.storeClaims).isEmpty()
    }

    @Test
    fun applyPolicy_storeClaims_nestedSubfields() {
        val policy = policies.getValue("NestedFooBarPolicy")
        val storeMap = mapOf("my_store_id" to "NestedFooBar")

        val result = translatePolicy(policy, PolicyOptions(storeMap))

        val store = AccessPath.Root.Store("my_store_id")
        val predicate = labelPredicate("allowedForEgress")
        assertThat(result.storeClaims).containsExactly(
            "my_store_id",
            listOf(
                Claim.Assume(AccessPath(store, selectors("foo")), predicate),
                Claim.Assume(AccessPath(store, selectors("foo", "a")), predicate),
                Claim.Assume(AccessPath(store, selectors("foo", "b")), predicate),
                Claim.Assume(AccessPath(store, selectors("foo", "c")), predicate),
                Claim.Assume(AccessPath(store, selectors("bar")), predicate),
                Claim.Assume(AccessPath(store, selectors("bar", "a")), predicate)
            )
        )
    }

    companion object {
        private const val BLANK_POLICY_NAME = "BlankPolicy"
        private const val BLANK_EGRESS_PARTICLE_NAME = "Egress_BlankPolicy"

        private val EMPTY_OPTIONS = PolicyOptions(storeMap = emptyMap())

        private val BLANK_POLICY = Policy(name = BLANK_POLICY_NAME, egressType = EgressType.LOGGING)

        private fun labelPredicate(label: String): Predicate.Label {
            return Predicate.Label(InformationFlowLabel.SemanticTag(label))
        }

        private fun selectors(vararg fields: String): List<AccessPath.Selector> {
            return fields.toList().map { AccessPath.Selector.Field(it) }
        }
    }
}
