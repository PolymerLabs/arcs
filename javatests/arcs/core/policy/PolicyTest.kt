package arcs.core.policy

import arcs.core.data.Annotation
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Encryption
import arcs.core.data.Capability.Persistence
import arcs.core.data.Capability.Ttl
import arcs.core.policy.PolicyRetention
import arcs.core.policy.PolicyTarget
import arcs.core.policy.StorageMedium
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class PolicyTest {
    @Test
    fun policyTarget_toCapabilities() {
        val policyTarget = PolicyTarget(
            schemaName = "schema",
            maxAgeMs = 2 * 60 * Ttl.MILLIS_IN_MIN, // 2 hours
            retentions = listOf(
                PolicyRetention(medium = StorageMedium.DISK, encryptionRequired = true),
                PolicyRetention(medium = StorageMedium.RAM, encryptionRequired = false)
            ),
            fields = emptyList(),
            annotations = emptyList()
        )
        val capabilities = policyTarget.toCapabilities()
        assertThat(capabilities).hasSize(2)
        assertThat(
            capabilities[0].isEquivalent(
                Capabilities(listOf(Persistence.ON_DISK, Encryption(true), Ttl.Minutes(120)))
            )
        ).isTrue()
        assertThat(
            capabilities[1].isEquivalent(
                Capabilities(listOf(Persistence.IN_MEMORY, Ttl.Minutes(120)))
            )
        ).isTrue()
    }

    fun policy_allFields() {
        val child = PolicyField("child")
        val parent = PolicyField("parent", subfields = listOf(child))
        val other = PolicyField("other")
        val policy = Policy(
            name = "MyPolicy",
            targets = listOf(
                PolicyTarget("target1", fields = listOf(parent)),
                PolicyTarget("target2", fields = listOf(other))
            ),
            egressType = EgressType.LOGGING
        )

        assertThat(policy.allFields).containsExactly(child, parent, other)
    }

    @Test
    fun policy_allRedactionLabels() {
        val child = PolicyField(
            fieldName = "child",
            redactedUsages = mapOf(
                "label1" to setOf(UsageType.EGRESS),
                "label2" to setOf(UsageType.JOIN)
            )
        )
        val parent = PolicyField(
            fieldName = "parent",
            subfields = listOf(child),
            redactedUsages = mapOf(
                "label2" to setOf(UsageType.EGRESS),
                "label3" to setOf(UsageType.EGRESS)
            )
        )
        val other = PolicyField(
            fieldName = "other",
            redactedUsages = mapOf("label4" to setOf(UsageType.EGRESS))
        )
        val policy = Policy(
            name = "MyPolicy",
            targets = listOf(
                PolicyTarget("target1", fields = listOf(parent)),
                PolicyTarget("target2", fields = listOf(other))
            ),
            egressType = EgressType.LOGGING
        )

        assertThat(policy.allRedactionLabels).containsExactly(
            "label1",
            "label2",
            "label3",
            "label4"
        )
    }
}
