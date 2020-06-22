package arcs.core.policy.proto

import arcs.core.data.Annotation
import arcs.core.data.proto.AnnotationProto
import arcs.core.data.proto.PolicyConfigProto
import arcs.core.data.proto.PolicyFieldProto
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
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.test.assertFailsWith

@RunWith(JUnit4::class)
class PolicyProtoTest {
    @Test
    fun decodesPolicy() {
        val proto = PolicyProto.newBuilder()
            .setName("foo")
            .setDescription("bar")
            .setEgressType(PolicyProto.EgressType.FEDERATED_AGGREGATION)
            .addAnnotations(ANNOTATION_PROTO)
            .build()

        val policy = proto.decode()

        val expected = Policy(
            name = "foo",
            description = "bar",
            egressType = EgressType.FederatedAggregation,
            targets = emptyList(),
            configs = emptyMap(),
            annotations = listOf(ANNOTATION)
        )
        assertThat(policy).isEqualTo(expected)
    }

    @Test
    fun decodesPolicy_requiresEgressType() {
        val e = assertFailsWith<UnsupportedOperationException> {
            PolicyProto.getDefaultInstance().decode()
        }
        assertThat(e).hasMessageThat().isEqualTo("Unknown egress type: EGRESS_TYPE_UNSPECIFIED")
    }

    @Test
    fun decodesTargets() {
        val proto = PolicyProto.newBuilder()
            .setEgressType(PolicyProto.EgressType.LOGGING)
            .addTargets(
                PolicyTargetProto.newBuilder()
                    .setMaxAgeMs(123)
                    .setSchemaType("schema")
                    .addRetentions(
                        PolicyRetentionProto.newBuilder()
                            .setMedium(PolicyRetentionProto.Medium.DISK)
                            .setEncryptionRequired(true)
                    )
                    .addAnnotations(ANNOTATION_PROTO)
            )
            .build()

        val policy = proto.decode()

        val expected = PolicyTarget(
            schemaName = "schema",
            maxAgeMs = 123,
            retentions = listOf(
                PolicyRetention(medium = StorageMedium.Disk, encryptionRequired = true)
            ),
            fields = emptyList(),
            annotations = listOf(ANNOTATION)
        )
        assertThat(policy.targets).containsExactly(expected)
    }

    @Test
    fun decodesRetentions_requiresMedium() {
        val proto = PolicyProto.newBuilder()
            .setEgressType(PolicyProto.EgressType.LOGGING)
            .addTargets(
                PolicyTargetProto.newBuilder()
                    .addRetentions(PolicyRetentionProto.getDefaultInstance())
            )
            .build()
        val e = assertFailsWith<UnsupportedOperationException> { proto.decode() }
        assertThat(e).hasMessageThat().isEqualTo("Unknown retention medium: MEDIUM_UNSPECIFIED")
    }

    @Test
    fun decodesFields() {
        val proto = PolicyProto.newBuilder()
            .setEgressType(PolicyProto.EgressType.LOGGING)
            .addTargets(
                PolicyTargetProto.newBuilder()
                    .addFields(
                        PolicyFieldProto.newBuilder()
                            .setName("field")
                            .addUsages(
                                PolicyFieldProto.AllowedUsage.newBuilder()
                                    .setUsage(PolicyFieldProto.UsageType.JOIN)
                            )
                            .addUsages(
                                PolicyFieldProto.AllowedUsage.newBuilder()
                                    .setUsage(PolicyFieldProto.UsageType.EGRESS)
                                    .setRedactionLabel("label")
                            )
                            .addUsages(
                                PolicyFieldProto.AllowedUsage.newBuilder()
                                    .setUsage(PolicyFieldProto.UsageType.JOIN)
                                    .setRedactionLabel("label")
                            )
                            .addAnnotations(ANNOTATION_PROTO)
                    )
            )
            .build()

        val policy = proto.decode()

        val expected = PolicyField(
            fieldName = "field",
            rawUsages = setOf(UsageType.Join),
            redactedUsages = mapOf("label" to setOf(UsageType.Egress, UsageType.Join)),
            subfields = emptyList(),
            annotations = listOf(ANNOTATION)
        )
        val actual = policy.targets.single().fields
        assertThat(actual).containsExactly(expected)
    }

    @Test
    fun decodesSubfields() {
        val proto = PolicyProto.newBuilder()
            .setEgressType(PolicyProto.EgressType.LOGGING)
            .addTargets(
                PolicyTargetProto.newBuilder()
                    .addFields(
                        PolicyFieldProto.newBuilder()
                            .setName("parent")
                            .addSubfields(
                                PolicyFieldProto.newBuilder()
                                    .setName("child")
                            )
                    )
            )
            .build()

        val policy = proto.decode()

        val expected = PolicyField(
            fieldName = "parent",
            rawUsages = emptySet(),
            redactedUsages = emptyMap(),
            subfields = listOf(
                PolicyField(
                    fieldName = "child",
                    rawUsages = emptySet(),
                    redactedUsages = emptyMap(),
                    subfields = emptyList(),
                    annotations = emptyList()
                )
            ),
            annotations = emptyList()
        )
        val actual = policy.targets.single().fields
        assertThat(actual).containsExactly(expected)
    }

    @Test
    fun decodesConfigs() {
        val proto = PolicyProto.newBuilder()
            .setEgressType(PolicyProto.EgressType.LOGGING)
            .addConfigs(
                PolicyConfigProto.newBuilder()
                    .setName("config")
                    .putMetadata("k1", "v1")
                    .putMetadata("k2", "v2")
            )
            .build()

        val policy = proto.decode()

        val expected = Policy(
            name = "",
            description = "",
            egressType = EgressType.Logging,
            targets = emptyList(),
            configs = mapOf("config" to mapOf("k1" to "v1", "k2" to "v2")),
            annotations = emptyList()
        )
        assertThat(policy).isEqualTo(expected)
    }

    companion object {
        val ANNOTATION_PROTO: AnnotationProto =
            AnnotationProto.newBuilder().setName("custom").build()
        val ANNOTATION = Annotation("custom", mapOf())
    }
}
