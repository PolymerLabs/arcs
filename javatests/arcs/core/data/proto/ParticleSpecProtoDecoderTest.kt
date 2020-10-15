package arcs.core.data.proto

import arcs.core.data.AccessPath
import arcs.core.data.Annotation
import arcs.core.data.Check
import arcs.core.data.Claim
import arcs.core.data.EntityType
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.InformationFlowLabel
import arcs.core.data.InformationFlowLabel.Predicate
import arcs.core.data.ParticleSpec
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.expression.Expression
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

typealias DirectionProto = HandleConnectionSpecProto.Direction

/**
 * Decodes the given [HandleConnectionSpecProto] text as [HandleConnectionSpec].
 */
fun decodeHandleConnectionSpecProto(protoText: String): HandleConnectionSpec {
  val builder = HandleConnectionSpecProto.newBuilder()
  TextFormat.getParser().merge(protoText, builder)
  return builder.build().decode()
}

/** Decodes the given [ParticleSpecProto] text as [ParticleSpec]. */
fun decodeParticleSpecProto(protoText: String): ParticleSpec {
  val builder = ParticleSpecProto.newBuilder()
  TextFormat.getParser().merge(protoText, builder)
  return builder.build().decode()
}

@RunWith(JUnit4::class)
class ParticleSpecProtoDecoderTest {
  @Test
  fun decodesDirectionProto() {
    assertFailsWith<IllegalArgumentException> {
      DirectionProto.UNSPECIFIED.decode()
    }
    assertThat(DirectionProto.READS.decode()).isEqualTo(HandleMode.Read)
    assertThat(DirectionProto.WRITES.decode()).isEqualTo(HandleMode.Write)
    assertThat(DirectionProto.READS_WRITES.decode()).isEqualTo(HandleMode.ReadWrite)
    assertFailsWith<IllegalArgumentException> {
      DirectionProto.UNRECOGNIZED.decode()
    }
  }

  private val schema = Schema(
    names = setOf(SchemaName("Thing")),
    fields = SchemaFields(
      mapOf<FieldName, FieldType>("name" to FieldType.Text),
      mapOf()
    ),
    // TODO: Hash.
    hash = ""
  )

  private fun getHandleConnectionSpecProto(
    name: String,
    direction: String,
    schemaName: String,
    expression: String? = null
  ): String {
    return """
        name: "$name"
        direction: $direction
        type {
          entity {
            schema {
              names: "$schemaName"
              fields {
                key: "name"
                value: { primitive: TEXT }
              }
            }
          }
        }
        ${expression?.let { "expression: \"$it\"" } ?: ""}
        """.trimIndent()
  }

  @Test
  fun decodesHandleConnectionSpecProto() {
    val handleConnectionSpecProto = getHandleConnectionSpecProto("data", "READS", "Thing")
    val connectionSpec = decodeHandleConnectionSpecProto(handleConnectionSpecProto)
    assertThat(connectionSpec.name).isEqualTo("data")
    assertThat(connectionSpec.direction).isEqualTo(HandleMode.Read)
    assertThat(connectionSpec.type).isEqualTo(EntityType(schema))
    assertThat(connectionSpec.expression).isNull()
  }

  @Test
  fun decodesHandleConnectionSpecProto_withExpression() {
    val handleConnectionSpecProto = getHandleConnectionSpecProto(
      "data", "READS", "Thing", "new Thing {x: foo.y}"
    )
    val connectionSpec = decodeHandleConnectionSpecProto(handleConnectionSpecProto)
    assertThat(connectionSpec.name).isEqualTo("data")
    assertThat(connectionSpec.direction).isEqualTo(HandleMode.Read)
    assertThat(connectionSpec.type).isEqualTo(EntityType(schema))
    assertThat(connectionSpec.expression).isInstanceOf(Expression.NewExpression::class.java)
  }

  @Test
  fun decodesParticleSpecProto() {
    val readConnectionSpecProto = getHandleConnectionSpecProto("read", "READS", "Thing")
    val writeConnectionSpecProto = getHandleConnectionSpecProto("write", "WRITES", "Thing")
    val readerSpecProto = """
          name: "Reader"
          connections { $readConnectionSpecProto }
          location: "Everywhere"
          annotations {
            name: "isolated"
          }
        """.trimIndent()
    val readerSpec = decodeParticleSpecProto(readerSpecProto)
    val readConnectionSpec = decodeHandleConnectionSpecProto(readConnectionSpecProto)
    assertThat(readerSpec).isEqualTo(
      ParticleSpec(
        name = "Reader",
        location = "Everywhere",
        connections = mapOf("read" to readConnectionSpec),
        annotations = listOf(Annotation.isolated)
      )
    )

    val readerWriterSpecProto = """
          name: "ReaderWriter"
          connections { $readConnectionSpecProto }
          connections { $writeConnectionSpecProto }
          location: "Nowhere"
          annotations {
            name: "egress"
            params {
              name: "type"
              str_value: "MyEgressType"
            }
          }
        """.trimIndent()
    val readerWriterSpec = decodeParticleSpecProto(readerWriterSpecProto)
    val writeConnectionSpec = decodeHandleConnectionSpecProto(writeConnectionSpecProto)
    assertThat(readerWriterSpec).isEqualTo(
      ParticleSpec(
        name = "ReaderWriter",
        location = "Nowhere",
        connections = mapOf("read" to readConnectionSpec, "write" to writeConnectionSpec),
        annotations = listOf(Annotation.createEgress("MyEgressType"))
      )
    )
  }

  @Test
  fun decodesParticleSpecProtoWithClaims() {
    val readConnectionSpecProto = getHandleConnectionSpecProto("read", "READS", "Thing")
    val writeConnectionSpecProto = getHandleConnectionSpecProto("write", "WRITES", "Thing")
    val readerWriterSpecProto = """
          name: "ReaderWriter"
          connections { $readConnectionSpecProto }
          connections { $writeConnectionSpecProto }
          location: "Nowhere"
          claims {
            assume {
              access_path {
                handle {
                  particle_spec: "ReaderWriter"
                  handle_connection: "write"
                }
              }
              predicate {
                label {
                  semantic_tag: "public"
                }
              }
            }
          }
          claims {
            derives_from {
              target {
                handle {
                  particle_spec: "ReaderWriter"
                  handle_connection: "write"
                }
              }
              source {
                handle {
                  particle_spec: "ReaderWriter"
                  handle_connection: "read"
                }
              }
            }
          }
       """.trimIndent()
    val readerWriterSpec = decodeParticleSpecProto(readerWriterSpecProto)
    val readConnectionSpec = decodeHandleConnectionSpecProto(readConnectionSpecProto)
    val writeConnectionSpec = decodeHandleConnectionSpecProto(writeConnectionSpecProto)
    assertThat(readerWriterSpec.claims).containsExactly(
      Claim.Assume(
        AccessPath("ReaderWriter", writeConnectionSpec),
        Predicate.Label(InformationFlowLabel.SemanticTag("public"))
      ),
      Claim.DerivesFrom(
        target = AccessPath("ReaderWriter", writeConnectionSpec),
        source = AccessPath("ReaderWriter", readConnectionSpec)
      )
    )
  }

  @Test
  fun decodesParticleSpecProtoWithChecks() {
    val readConnectionSpecProto = getHandleConnectionSpecProto("read", "READS", "Thing")
    val readerWriterSpecProto = """
          name: "ReaderWriter"
          connections { $readConnectionSpecProto }
          location: "Nowhere"
          checks {
            access_path {
              handle {
                particle_spec: "ReaderWriter"
                handle_connection: "read"
              }
            }
            predicate {
              label {
                semantic_tag: "public"
              }
            }
          }
          checks {
            access_path {
              handle {
                particle_spec: "ReaderWriter"
                handle_connection: "read"
              }
            }
            predicate {
              label {
                semantic_tag: "invalid"
              }
            }
          }
       """.trimIndent()
    val readerWriterSpec = decodeParticleSpecProto(readerWriterSpecProto)
    val readConnectionSpec = decodeHandleConnectionSpecProto(readConnectionSpecProto)
    assertThat(readerWriterSpec.checks).containsExactly(
      Check(
        AccessPath("ReaderWriter", readConnectionSpec),
        Predicate.Label(InformationFlowLabel.SemanticTag("public"))
      ),
      Check(
        AccessPath("ReaderWriter", readConnectionSpec),
        Predicate.Label(InformationFlowLabel.SemanticTag("invalid"))
      )
    )
  }

  @Test
  fun detectsDuplicateConnections() {
    val readConnectionSpecProto = getHandleConnectionSpecProto("read", "READS", "Thing")
    val readerSpecProto = """
          name: "Reader"
          connections { $readConnectionSpecProto }
          connections { $readConnectionSpecProto }
          location: "Everywhere"
        """.trimIndent()
    val exception = assertFailsWith<IllegalArgumentException> {
      decodeParticleSpecProto(readerSpecProto)
    }
    assertThat(exception).hasMessageThat().contains("Duplicate connection 'read'")
  }
}
