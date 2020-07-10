package arcs.core.policy

import arcs.core.data.Capabilities
import arcs.core.data.Capability.Encryption
import arcs.core.data.Capability.Persistence
import arcs.core.data.Capability.Ttl
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

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

    @Test
    fun policy_allFields() {
        val child = PolicyField(listOf("parent", "child"))
        val parent = PolicyField(listOf("parent"), subfields = listOf(child))
        val other = PolicyField(listOf("other"))
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
            fieldPath = listOf("parent", "child"),
            redactedUsages = mapOf(
                "label1" to setOf(UsageType.EGRESS),
                "label2" to setOf(UsageType.JOIN)
            )
        )
        val parent = PolicyField(
            fieldPath = listOf("parent"),
            subfields = listOf(child),
            redactedUsages = mapOf(
                "label2" to setOf(UsageType.EGRESS),
                "label3" to setOf(UsageType.EGRESS)
            )
        )
        val other = PolicyField(
            fieldPath = listOf("other"),
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

    @Test
    fun policyField_fieldPathMustBeNestedInsideParent() {
        val childWithRightParent = PolicyField(
            fieldPath = listOf("correct", "child")
        )
        val childWithWrongParent = PolicyField(
            fieldPath = listOf("incorrect", "child")
        )

        // Passes:
        PolicyField(
            fieldPath = listOf("correct"),
            subfields = listOf(childWithRightParent)
        )

        // Fails:
        assertFailsWith<IllegalArgumentException> {
            PolicyField(
                fieldPath = listOf("correct"),
                subfields = listOf(childWithWrongParent)
            )
        }
    }
}
