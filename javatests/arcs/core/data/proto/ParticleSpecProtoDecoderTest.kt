package arcs.core.data.proto

import arcs.core.data.AccessPath
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
import arcs.core.util.Result
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
    val result = builder.build().decode()
    return when (result) {
        is Result.Ok -> result.value
        is Result.Err -> throw result.thrown
    }
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

    private fun getHandleConnectionSpecProto(
        name: String,
        direction: String,
        schemaName: String
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
        """.trimIndent()
    }

    @Test
    fun decodesHandleConnectionSpecProto() {
        val singletons = mapOf<FieldName, FieldType>("name" to FieldType.Text)
        val fields = SchemaFields(singletons, mapOf())
        // TODO: Hash.
        val handleConnectionSpecProto = getHandleConnectionSpecProto("data", "READS", "Thing")
        val schema = Schema(setOf(SchemaName("Thing")), fields, hash = "")
        val connectionSpec = decodeHandleConnectionSpecProto(handleConnectionSpecProto)
        assertThat(connectionSpec.name).isEqualTo("data")
        assertThat(connectionSpec.direction).isEqualTo(HandleMode.Read)
        assertThat(connectionSpec.type).isEqualTo(EntityType(schema))
    }

    @Test
    fun decodesParticleSpecProto() {
        val readConnectionSpecProto = getHandleConnectionSpecProto("read", "READS", "Thing")
        val writeConnectionSpecProto = getHandleConnectionSpecProto("write", "WRITES", "Thing")
        val readerSpecProto = """
          name: "Reader"
          connections { $readConnectionSpecProto }
          location: "Everywhere"
          isolated: true
        """.trimIndent()
        val readerSpec = decodeParticleSpecProto(readerSpecProto)
        val readConnectionSpec = decodeHandleConnectionSpecProto(readConnectionSpecProto)
        assertThat(readerSpec).isEqualTo(
            ParticleSpec(
                name = "Reader",
                location = "Everywhere",
                connections = mapOf("read" to readConnectionSpec),
                isolated = true
            )
        )

        val readerWriterSpecProto = """
          name: "ReaderWriter"
          connections { $readConnectionSpecProto }
          connections { $writeConnectionSpecProto }
          location: "Nowhere"
          isolated: false
        """.trimIndent()
        val readerWriterSpec = decodeParticleSpecProto(readerWriterSpecProto)
        val writeConnectionSpec = decodeHandleConnectionSpecProto(writeConnectionSpecProto)
        assertThat(readerWriterSpec).isEqualTo(
            ParticleSpec(
                name = "ReaderWriter",
                location = "Nowhere",
                connections = mapOf("read" to readConnectionSpec, "write" to writeConnectionSpec),
                isolated = false
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
                particle_spec: "ReaderWriter"
                handle_connection: "write"
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
                particle_spec: "ReaderWriter"
                handle_connection: "write"
              }
              source {
                particle_spec: "ReaderWriter"
                handle_connection: "read"
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
              particle_spec: "ReaderWriter"
              handle_connection: "read"
            }
            predicate {
              label {
                semantic_tag: "public"
              }
            }
          }
          checks {
            access_path {
              particle_spec: "ReaderWriter"
              handle_connection: "read"
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
            Check.Assert(
                AccessPath("ReaderWriter", readConnectionSpec),
                Predicate.Label(InformationFlowLabel.SemanticTag("public"))
            ),
            Check.Assert(
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
