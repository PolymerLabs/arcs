package arcs.core.policy.proto

import arcs.core.data.Annotation
import arcs.core.data.proto.PolicyProto
import arcs.core.data.proto.PolicyRetentionProto
import arcs.core.data.proto.PolicyTargetProto
import arcs.core.policy.EgressType
import arcs.core.policy.Policy
import arcs.core.policy.PolicyField
import arcs.core.policy.PolicyRetention
import arcs.core.policy.PolicyTarget
import arcs.core.policy.StorageMedium
import arcs.core.policy.UsageType
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class PolicyProtoTest {
    @Test
    fun roundTrip_policy() {
        val policy = Policy(
            name = "foo",
            description = "bar",
            egressType = EgressType.FEDERATED_AGGREGATION,
            targets = emptyList(),
            configs = emptyMap(),
            annotations = listOf(ANNOTATION)
        )
        assertThat(policy.encode().decode()).isEqualTo(policy)
    }

    @Test
    fun decode_policy_requiresEgressType() {
        val e = assertFailsWith<UnsupportedOperationException> {
            PolicyProto.getDefaultInstance().decode()
        }
        assertThat(e).hasMessageThat().startsWith("Unknown egress type:")
    }

    @Test
    fun roundTrip_target() {
        val policy = Policy(
            name = "foo",
            egressType = EgressType.LOGGING,
            targets = listOf(
                PolicyTarget(
                    schemaName = "schema",
                    maxAgeMs = 123,
                    retentions = listOf(
                        PolicyRetention(medium = StorageMedium.DISK, encryptionRequired = true)
                    ),
                    fields = emptyList(),
                    annotations = listOf(ANNOTATION)
                )
            )
        )
        assertThat(policy.encode().decode()).isEqualTo(policy)
    }

    @Test
    fun decode_retention_requiresMedium() {
        val proto = PolicyProto.newBuilder()
            .setEgressType(PolicyProto.EgressType.LOGGING)
            .addTargets(
                PolicyTargetProto.newBuilder()
                    .addRetentions(PolicyRetentionProto.getDefaultInstance())
            )
            .build()
        val e = assertFailsWith<UnsupportedOperationException> { proto.decode() }
        assertThat(e).hasMessageThat().startsWith("Unknown retention medium:")
    }

    @Test
    fun roundTrip_fields() {
        val policy = Policy(
            name = "foo",
            egressType = EgressType.LOGGING,
            targets = listOf(
                PolicyTarget(
                    schemaName = "schema",
                    fields = listOf(
                        PolicyField(
                            fieldPath = listOf("field"),
                            rawUsages = setOf(UsageType.JOIN),
                            redactedUsages = mapOf(
                                "label" to setOf(UsageType.EGRESS, UsageType.JOIN)
                            ),
                            subfields = emptyList(),
                            annotations = listOf(ANNOTATION)
                        )
                    )
                )
            )
        )
        assertThat(policy.encode().decode()).isEqualTo(policy)
    }

    @Test
    fun roundTrip_subfields() {
        val policy = Policy(
            name = "foo",
            egressType = EgressType.LOGGING,
            targets = listOf(
                PolicyTarget(
                    schemaName = "schema",
                    fields = listOf(
                        PolicyField(
                            fieldPath = listOf("parent"),
                            rawUsages = emptySet(),
                            redactedUsages = emptyMap(),
                            subfields = listOf(
                                PolicyField(
                                    fieldPath = listOf("parent", "child"),
                                    rawUsages = emptySet(),
                                    redactedUsages = emptyMap(),
                                    subfields = emptyList(),
                                    annotations = emptyList()
                                )
                            ),
                            annotations = emptyList()
                        )
                    )
                )
            )
        )
        assertThat(policy.encode().decode()).isEqualTo(policy)
    }

    @Test
    fun roundTrip_configs() {
        val policy = Policy(
            name = "foo",
            egressType = EgressType.LOGGING,
            configs = mapOf("config" to mapOf("k1" to "v1", "k2" to "v2"))
        )
        assertThat(policy.encode().decode()).isEqualTo(policy)
    }

    companion object {
        val ANNOTATION = Annotation("custom", mapOf())
    }
}
