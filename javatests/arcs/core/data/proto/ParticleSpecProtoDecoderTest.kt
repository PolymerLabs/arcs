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
fun toHandleConnectionSpecProto(protoText: String): HandleConnectionSpecProto {
  val builder = HandleConnectionSpecProto.newBuilder()
  TextFormat.getParser().merge(protoText, builder)
  return builder.build()
}

/** Decodes the given [ParticleSpecProto] text as [ParticleSpec]. */
fun toParticleSpecProto(protoText: String): ParticleSpecProto {
  val builder = ParticleSpecProto.newBuilder()
  TextFormat.getParser().merge(protoText, builder)
  return builder.build()
}

fun assertRoundTrip(proto: HandleConnectionSpecProto) {
  assertThat(proto.decode().encode()).isEqualTo(proto)
}

fun assertRoundTrip(proto: ParticleSpecProto) {
  assertThat(proto.decode().encode()).isEqualTo(proto)
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
    assertThat(DirectionProto.READS_WRITES_QUERY.decode()).isEqualTo(HandleMode.ReadWriteQuery)
    assertThat(DirectionProto.QUERY.decode()).isEqualTo(HandleMode.Query)
    assertThat(DirectionProto.READS_QUERY.decode()).isEqualTo(HandleMode.ReadQuery)
    assertThat(DirectionProto.WRITES_QUERY.decode()).isEqualTo(HandleMode.WriteQuery)
    assertThat(DirectionProto.READS_WRITES_QUERY.decode()).isEqualTo(HandleMode.ReadWriteQuery)
    assertFailsWith<IllegalArgumentException> {
      DirectionProto.UNRECOGNIZED.decode()
    }
  }

  @Test
  fun roundTripsDirectionProto() {
    assertThat(DirectionProto.READS.decode().encode()).isEqualTo(DirectionProto.READS)
    assertThat(DirectionProto.WRITES.decode().encode()).isEqualTo(DirectionProto.WRITES)
    assertThat(DirectionProto.READS_WRITES.decode().encode()).isEqualTo(DirectionProto.READS_WRITES)
    assertThat(DirectionProto.QUERY.decode().encode()).isEqualTo(DirectionProto.QUERY)
    assertThat(DirectionProto.READS_QUERY.decode().encode()).isEqualTo(DirectionProto.READS_QUERY)
    assertThat(DirectionProto.WRITES_QUERY.decode().encode()).isEqualTo(DirectionProto.WRITES_QUERY)
    assertThat(DirectionProto.READS_WRITES_QUERY.decode().encode())
      .isEqualTo(DirectionProto.READS_WRITES_QUERY)
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

  private fun getHandleConnectionSpecProtoText(
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
              refinement: "true"
              query: "true"
            }
          }
        }
        ${expression?.let { "expression: \"$it\"" } ?: ""}
        """.trimIndent()
  }

  @Test
  fun decodesHandleConnectionSpecProto() {
    val handleConnectionSpecProto = getHandleConnectionSpecProtoText("data", "READS", "Thing")
    val connectionSpec = toHandleConnectionSpecProto(handleConnectionSpecProto).decode()
    assertThat(connectionSpec.name).isEqualTo("data")
    assertThat(connectionSpec.direction).isEqualTo(HandleMode.Read)
    assertThat(connectionSpec.type).isEqualTo(EntityType(schema))
    assertThat(connectionSpec.expression).isNull()
  }

  @Test
  fun roundTripsHandleConnectionSpecProto() {
    val connectionSpec = toHandleConnectionSpecProto(
      getHandleConnectionSpecProtoText("data", "READS", "Thing")
    )
    assertRoundTrip(connectionSpec)
  }

  @Test
  fun decodesHandleConnectionSpecProto_withExpression() {
    val handleConnectionSpecProto = getHandleConnectionSpecProtoText(
      "data", "READS", "Thing", "new Thing {x: foo.y}"
    )
    val connectionSpec = toHandleConnectionSpecProto(handleConnectionSpecProto).decode()
    assertThat(connectionSpec.name).isEqualTo("data")
    assertThat(connectionSpec.direction).isEqualTo(HandleMode.Read)
    assertThat(connectionSpec.type).isEqualTo(EntityType(schema))
    assertThat(connectionSpec.expression).isInstanceOf(Expression.NewExpression::class.java)
  }

  @Test
  fun roundTripsHandleConnectionSpecProto_withExpression() {
    val connectionSpec = toHandleConnectionSpecProto(
      getHandleConnectionSpecProtoText(
        "data", "READS", "Thing", "new Thing {x: foo.y}"
      )
    )
    with(connectionSpec.decode().encode()) {
      assertThat(name).isEqualTo(connectionSpec.name)
      assertThat(direction).isEqualTo(connectionSpec.direction)
      assertThat(type).isEqualTo(connectionSpec.type)
      assertThat(expression.replace("\\s+".toRegex(), ""))
        .isEqualTo(connectionSpec.expression.replace("\\s+".toRegex(), ""))
    }
  }

  @Test
  fun decodesParticleSpecProto() {
    val readConnectionSpecProto = getHandleConnectionSpecProtoText("read", "READS", "Thing")
    val writeConnectionSpecProto = getHandleConnectionSpecProtoText("write", "WRITES", "Thing")
    val readerSpecProto = """
          name: "Reader"
          connections { $readConnectionSpecProto }
          location: "Everywhere"
          annotations {
            name: "isolated"
          }
        """.trimIndent()
    val readerSpec = toParticleSpecProto(readerSpecProto).decode()
    val readConnectionSpec = toHandleConnectionSpecProto(readConnectionSpecProto).decode()
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
    val readerWriterSpec = toParticleSpecProto(readerWriterSpecProto).decode()
    val writeConnectionSpec = toHandleConnectionSpecProto(writeConnectionSpecProto).decode()
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
  fun roundTripsParticleSpecProto() {
    val readConnectionSpecProto = getHandleConnectionSpecProtoText("read", "READS", "Thing")
    val writeConnectionSpecProto = getHandleConnectionSpecProtoText("write", "WRITES", "Thing")
    val readerSpecProto = """
          name: "Reader"
          connections { $readConnectionSpecProto }
          location: "Everywhere"
          annotations {
            name: "isolated"
          }
        """.trimIndent()
    val readerSpec = toParticleSpecProto(readerSpecProto)
    val readConnectionSpec = toHandleConnectionSpecProto(readConnectionSpecProto)
    assertRoundTrip(readerSpec)
    assertRoundTrip(readConnectionSpec)

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
    val readerWriterSpec = toParticleSpecProto(readerWriterSpecProto)
    val writeConnectionSpec = toHandleConnectionSpecProto(writeConnectionSpecProto)
    assertRoundTrip(readerWriterSpec)
    assertRoundTrip(writeConnectionSpec)
  }

  @Test
  fun decodesParticleSpecProtoWithClaims() {
    val readConnectionSpecProto = getHandleConnectionSpecProtoText("read", "READS", "Thing")
    val writeConnectionSpecProto = getHandleConnectionSpecProtoText("write", "WRITES", "Thing")
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
    val readerWriterSpec = toParticleSpecProto(readerWriterSpecProto).decode()
    val readConnectionSpec = toHandleConnectionSpecProto(readConnectionSpecProto).decode()
    val writeConnectionSpec = toHandleConnectionSpecProto(writeConnectionSpecProto).decode()
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
  fun roundTripsParticleSpecProtoWithClaims() {
    val readConnectionSpecProto = getHandleConnectionSpecProtoText("read", "READS", "Thing")
    val writeConnectionSpecProto = getHandleConnectionSpecProtoText("write", "WRITES", "Thing")
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
    val readerWriterSpec = toParticleSpecProto(readerWriterSpecProto)
    val readConnectionSpec = toHandleConnectionSpecProto(readConnectionSpecProto)
    val writeConnectionSpec = toHandleConnectionSpecProto(writeConnectionSpecProto)
    assertRoundTrip(readerWriterSpec)
    assertRoundTrip(readConnectionSpec)
    assertRoundTrip(writeConnectionSpec)
  }

  @Test
  fun decodesParticleSpecProtoWithChecks() {
    val readConnectionSpecProto = getHandleConnectionSpecProtoText("read", "READS", "Thing")
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
    val readerWriterSpec = toParticleSpecProto(readerWriterSpecProto).decode()
    val readConnectionSpec = toHandleConnectionSpecProto(readConnectionSpecProto).decode()
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
  fun roundTripsParticleSpecProtoWithChecks() {
    val readConnectionSpecProto = getHandleConnectionSpecProtoText("read", "READS", "Thing")
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
    val readerWriterSpec = toParticleSpecProto(readerWriterSpecProto)
    val readConnectionSpec = toHandleConnectionSpecProto(readConnectionSpecProto)
    assertRoundTrip(readerWriterSpec)
    assertRoundTrip(readConnectionSpec)
  }

  @Test
  fun detectsDuplicateConnections() {
    val readConnectionSpecProto = getHandleConnectionSpecProtoText("read", "READS", "Thing")
    val readerSpecProto = """
          name: "Reader"
          connections { $readConnectionSpecProto }
          connections { $readConnectionSpecProto }
          location: "Everywhere"
        """.trimIndent()
    val exception = assertFailsWith<IllegalArgumentException> {
      toParticleSpecProto(readerSpecProto).decode()
    }
    assertThat(exception).hasMessageThat().contains("Duplicate connection 'read'")
  }
}
