package arcs.core.data.proto

import arcs.core.data.*
import arcs.core.testutil.assertThrows
import arcs.core.testutil.fail
import arcs.core.util.Result
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.Message.Builder
import com.google.protobuf.Message
import com.google.protobuf.TextFormat
import java.io.File
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
        assertThat(DirectionProto.READS.decode()).isEqualTo(HandleConnectionSpec.Direction.READS)
        assertThat(DirectionProto.WRITES.decode()).isEqualTo(HandleConnectionSpec.Direction.WRITES)
        assertThat(DirectionProto.READS_WRITES.decode()).isEqualTo(
            HandleConnectionSpec.Direction.READS_WRITES)
        assertThrows(IllegalArgumentException::class) {
            DirectionProto.UNRECOGNIZED.decode()
        }
    }

    private fun getHandleConnectionSpecProto(
        name: String,
        direction: String,
        schemaName: String
    ): String {
        return """
        name: "${name}"
        direction: ${direction}
        type {
          entity {
            schema {
              names: "${schemaName}"
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
        val fields = SchemaFields(singletons, mapOf<FieldName, FieldType>())
        // TODO: Hash.
        val handleConnectionSpecProto = getHandleConnectionSpecProto("data", "READS", "Thing")
        val schema = Schema(listOf(SchemaName("Thing")), fields, hash="")
        val connectionSpec = decodeHandleConnectionSpecProto(handleConnectionSpecProto)
        assertThat(connectionSpec.name).isEqualTo("data")
        assertThat(connectionSpec.direction).isEqualTo(HandleConnectionSpec.Direction.READS)
        assertThat(connectionSpec.type).isEqualTo(EntityType(schema))
    }

    @Test
    fun decodesParticleSpecProto() {
        val readConnectionSpecProto = getHandleConnectionSpecProto("read", "READS", "Thing")
        val writeConnectionSpecProto = getHandleConnectionSpecProto("write", "WRITES", "Thing")
        val readerSpecProto = """
          name: "Reader"
          connections { ${readConnectionSpecProto} }
          location: "Everywhere"
        """.trimIndent()
        val readerSpec = decodeParticleSpecProto(readerSpecProto)
        val readConnectionSpec = decodeHandleConnectionSpecProto(readConnectionSpecProto)
        assertThat(readerSpec.name).isEqualTo("Reader")
        assertThat(readerSpec.location).isEqualTo("Everywhere")
        assertThat(readerSpec.connections).isEqualTo(mapOf("read" to readConnectionSpec))

        val readerWriterSpecProto = """
          name: "ReaderWriter"
          connections { ${readConnectionSpecProto} }
          connections { ${writeConnectionSpecProto} }
          location: "Nowhere"
        """.trimIndent()
        val readerWriterSpec = decodeParticleSpecProto(readerWriterSpecProto)
        val writeConnectionSpec = decodeHandleConnectionSpecProto(writeConnectionSpecProto)
        assertThat(readerWriterSpec.name).isEqualTo("ReaderWriter")
        assertThat(readerWriterSpec.location).isEqualTo("Nowhere")
        assertThat(readerWriterSpec.connections).isEqualTo(
            mapOf("read" to readConnectionSpec, "write" to writeConnectionSpec))
    }
}
