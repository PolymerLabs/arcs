package arcs.core.data.proto

import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.Recipe.Handle
import arcs.core.data.Recipe.Particle
import arcs.core.data.ParticleSpec
import arcs.core.data.TypeVariable
import arcs.core.testutil.assertThrows
import arcs.core.testutil.fail
import arcs.core.util.Result
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.Message.Builder
import com.google.protobuf.Message
import com.google.protobuf.TextFormat
import java.io.File
import org.junit.Before
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
            .build()
        // When decoded as part of readerSpec, the mode is [HandleMode.Read].
        val readConnection = handleConnectionProto.decode(readerSpec, context)
        assertThat(readConnection.spec).isEqualTo(readConnectionSpec)
        assertThat(readConnection.handle).isEqualTo(thingHandle)
    }

    @Test
    fun decodeHandleConnectionDetectsMissingConnectionSpec() {
        var proto = HandleConnectionProto
            .newBuilder()
            .setName("unknown")
            .setHandle("thing")
            .build()
        val exception = assertThrows(IllegalArgumentException::class) {
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
            .build()
        val exception = assertThrows(IllegalArgumentException::class) {
            proto.decode(writerSpec, context)
        }
        assertThat(exception)
            .hasMessageThat()
            .contains("Handle 'unknown' not found when decoding ParticleProto 'Writer'")
    }

    @Test
    fun decodesParticleProto() {
        val readConnectionProto = HandleConnectionProto
            .newBuilder()
            .setName("data")
            .setHandle("thing")
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
                listOf(Particle.HandleConnection(readConnectionSpec, thingHandle))
            )
        }
    }

    @Test
    fun decodesParticleProtoWithMultipleConnections() {
        val readConnectionProto = HandleConnectionProto
            .newBuilder()
            .setName("read")
            .setHandle("thing")
            .build()
        val writeConnectionProto = HandleConnectionProto
            .newBuilder()
            .setName("write")
            .setHandle("thing")
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
                Particle.HandleConnection(readConnectionSpec, thingHandle),
                Particle.HandleConnection(writeConnectionSpec, thingHandle)
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
        val exception = assertThrows(IllegalArgumentException::class) {
            particleProto.decode(context)
        }
        assertThat(exception).hasMessageThat().contains("ParticleSpec 'NonExistent' not found")
    }
}
