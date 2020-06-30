package arcs.core.data.proto

import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe.Handle
import arcs.core.data.Recipe.Particle
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ParticleProtoDecoderTest {
    // The test environment.
    var ramdiskStorageKey = "ramdisk://something"
    val thingHandle = Handle(
        "thing",
        Handle.Fate.CREATE,
        TypeVariable("thing"),
        ramdiskStorageKey
    )
    val thingTypeProto = parseTypeProtoText(
        """
          entity {
            schema {
              names: "Thing"
              fields {
                key: "name"
                value: { primitive: TEXT }
              }
            }
          }
        """.trimIndent()
    )
    val thingType = EntityType(Schema(
        names = setOf(SchemaName("Thing")),
        fields = SchemaFields(singletons = mapOf("name" to FieldType.Text), collections = emptyMap()),
        hash = ""
    ))
    val readConnectionSpec = HandleConnectionSpec("data", HandleMode.Read, TypeVariable("data"))
    val readerSpec = ParticleSpec("Reader", mapOf("data" to readConnectionSpec), "ReaderLocation")
    val writeConnectionSpec = HandleConnectionSpec("data", HandleMode.Write, TypeVariable("data"))
    val writerSpec = ParticleSpec("Writer", mapOf("data" to writeConnectionSpec), "WriterLocation")
    val readerWriterSpec = ParticleSpec(
        "ReaderWriter",
        mapOf(
            "write" to writeConnectionSpec,
            "read" to readConnectionSpec
        ),
        "ReaderWriterLocation"
    )
    val context = DecodingContext(
        particleSpecs = mapOf(
            "Reader" to readerSpec,
            "Writer" to writerSpec,
            "ReaderWriter" to readerWriterSpec
        ),
        recipeHandles = mapOf("thing" to thingHandle)
    )

    @Test
    fun decodesHandleConnnection() {
        var handleConnectionProto = HandleConnectionProto
            .newBuilder()
            .setName("data")
            .setHandle("thing")
            .setType(thingTypeProto)
            .build()
        // When decoded as part of readerSpec, the mode is [HandleMode.Read].
        val readConnection = handleConnectionProto.decode(readerSpec, context)
        assertThat(readConnection.spec).isEqualTo(readConnectionSpec)
        assertThat(readConnection.handle).isEqualTo(thingHandle)
        assertThat(readConnection.type).isEqualTo(thingType)
    }

    @Test
    fun decodeHandleConnectionDetectsMissingConnectionSpec() {
        var proto = HandleConnectionProto
            .newBuilder()
            .setName("unknown")
            .setHandle("thing")
            .setType(thingTypeProto)
            .build()
        val exception = assertFailsWith<IllegalArgumentException> {
            proto.decode(readerSpec, context)
        }
        assertThat(exception)
            .hasMessageThat()
            .contains("HandleConnection 'unknown' not found in ParticleSpec 'Reader'")
    }

    @Test
    fun decodeHandleConnectionDetectsMissingHandle() {
        val proto = HandleConnectionProto
            .newBuilder()
            .setName("data")
            .setHandle("unknown")
            .setType(thingTypeProto)
            .build()
        val exception = assertFailsWith<IllegalArgumentException> {
            proto.decode(writerSpec, context)
        }
        assertThat(exception)
            .hasMessageThat()
            .contains("Handle 'unknown' not found when decoding ParticleProto 'Writer'")
    }

    @Test
    fun decodeHandleConnectionDetectsMissingType() {
        val proto = HandleConnectionProto
            .newBuilder()
            .setName("data")
            .setHandle("thing")
            .build()

        val exception = assertFailsWith<IllegalArgumentException> {
            proto.decode(readerSpec, context)
        }
        assertThat(exception)
            .hasMessageThat()
            .contains("Unknown data field in TypeProto.")
    }

    @Test
    fun decodesParticleProto() {
        val readConnectionProto = HandleConnectionProto
            .newBuilder()
            .setName("data")
            .setHandle("thing")
            .setType(thingTypeProto)
            .build()
        val particleProto = ParticleProto
            .newBuilder()
            .setSpecName("Reader")
            .addConnections(readConnectionProto)
            .build()
        readConnectionProto.decode(readerSpec, context)
        with(particleProto.decode(context)) {
            assertThat(spec).isEqualTo(readerSpec)
            assertThat(handleConnections).isEqualTo(
                listOf(Particle.HandleConnection(readConnectionSpec, thingHandle, thingType))
            )
        }
    }

    @Test
    fun decodesParticleProtoWithMultipleConnections() {
        val readConnectionProto = HandleConnectionProto
            .newBuilder()
            .setName("read")
            .setHandle("thing")
            .setType(thingTypeProto)
            .build()
        val writeConnectionProto = HandleConnectionProto
            .newBuilder()
            .setName("write")
            .setHandle("thing")
            .setType(thingTypeProto)
            .build()
        val particleProto = ParticleProto
            .newBuilder()
            .setSpecName("ReaderWriter")
            .addConnections(readConnectionProto)
            .addConnections(writeConnectionProto)
            .build()
        readConnectionProto.decode(readerWriterSpec, context)
        writeConnectionProto.decode(readerWriterSpec, context)
        with(particleProto.decode(context)) {
            assertThat(spec).isEqualTo(readerWriterSpec)
            assertThat(handleConnections).containsExactly(
                Particle.HandleConnection(readConnectionSpec, thingHandle, thingType),
                Particle.HandleConnection(writeConnectionSpec, thingHandle, thingType)
            )
        }
    }

    @Test
    fun decodesParticleProtoWithNoConnections() {
        val emptyParticleProto = ParticleProto
            .newBuilder()
            .setSpecName("Reader")
            .build()
        with(emptyParticleProto.decode(context)) {
            assertThat(spec).isEqualTo(readerSpec)
            assertThat(handleConnections).isEmpty()
        }
    }

    @Test
    fun decodeParticleDetectsMissingSpecs() {
        val particleProto = ParticleProto
            .newBuilder()
            .setSpecName("NonExistent")
            .build()
        val exception = assertFailsWith<IllegalArgumentException> {
            particleProto.decode(context)
        }
        assertThat(exception).hasMessageThat().contains("ParticleSpec 'NonExistent' not found")
    }
}
