package arcs.core.policy

import arcs.core.data.AccessPath
import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.policy.proto.decode
import arcs.core.testutil.protoloader.loadManifestBinaryProto
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PolicyConstraintsTest {
    @Test
    fun applyPolicy_egressCheck_withoutRedactionLabels() {
        val policy = BLANK_POLICY.copy(name = "SingleInput")

        val result = translatePolicy(policy)

        assertThat(result.egressCheck).isEqualTo(labelPredicate("allowedForEgress"))
    }

    @Test
    fun applyPolicy_egressCheck_withRedactionLabels() {
        val policy = policies.getValue("FooRedactions")

        val result = translatePolicy(policy)

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

        val result = translatePolicy(policy)

        assertThat(result.egressCheck).isEqualTo(labelPredicate("allowedForEgress"))
    }

    @Test
    fun applyPolicy_claims_fieldClaim() {
        val policy = policies.getValue("FooRedactions")

        val result = translatePolicy(policy)

        assertThat(result.claims).containsExactly(
            "Foo",
            listOf(
                SelectorClaim(selectors("a"), labelPredicate("allowedForEgress_redaction1")),
                SelectorClaim(selectors("b"), labelPredicate("allowedForEgress_redaction2")),
                SelectorClaim(selectors("c"), labelPredicate("allowedForEgress_redaction3"))
            )
        )
    }

    @Test
    fun applyPolicy_claims_fieldsNotInPolicyDoNotHaveClaims() {
        val policy = policies.getValue("SingleFooRedaction")

        val result = translatePolicy(policy)

        assertThat(result.claims).containsExactly(
            "Foo",
            listOf(
                SelectorClaim(selectors("a"), labelPredicate("allowedForEgress_redaction1"))
            )
        )
    }

    @Test
    fun applyPolicy_claims_emptyPolicy() {
        val result = translatePolicy(BLANK_POLICY)

        assertThat(result.claims).isEmpty()
    }

    @Test
    fun applyPolicy_claims_joinUsageType() {
        val policy = policies.getValue("FooJoinPolicy")

        val result = translatePolicy(policy)

        assertThat(result.claims).containsExactly("Foo", emptyList<SelectorClaim>())
    }

    @Test
    fun applyPolicy_claims_nestedSubfields() {
        val policy = policies.getValue("NestedFooBarPolicy")

        val result = translatePolicy(policy)

        val predicate = labelPredicate("allowedForEgress")
        assertThat(result.claims).containsExactly(
            "NestedFooBar",
            listOf(
                SelectorClaim(selectors("foo"), predicate),
                SelectorClaim(selectors("foo", "a"), predicate),
                SelectorClaim(selectors("foo", "b"), predicate),
                SelectorClaim(selectors("foo", "c"), predicate),
                SelectorClaim(selectors("bar"), predicate),
                SelectorClaim(selectors("bar", "a"), predicate)
            )
        )
    }

    companion object {
        private const val BLANK_POLICY_NAME = "BlankPolicy"

        private val BLANK_POLICY = Policy(name = BLANK_POLICY_NAME, egressType = "Logging")

        private fun labelPredicate(label: String): Predicate.Label {
            return Predicate.Label(InformationFlowLabel.SemanticTag(label))
        }

        private fun selectors(vararg fields: String): List<AccessPath.Selector> {
            return fields.toList().map { AccessPath.Selector.Field(it) }
        }

        // Loaded from binary proto, maps all keyed by name.
        private val policies: Map<String, Policy> = loadManifestBinaryProto(
            "javatests/arcs/core/policy/PolicyTranslationTestData.binarypb"
        ).policiesList
            .map { it.decode() }
            .associateBy { it.name }
    }
}
