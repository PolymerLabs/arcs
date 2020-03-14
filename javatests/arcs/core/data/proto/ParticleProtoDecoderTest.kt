package arcs.core.data.proto

import arcs.core.data.*
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.keys.RamDiskStorageKey
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

typealias Direction = HandleConnectionSpec.Direction

@RunWith(JUnit4::class)
class ParticleProtoDecoderTest {
    // The test environment.
    var ramdiskStorageKey = "ramdisk://something"
    val thingHandleProto = HandleProto
        .newBuilder()
        .setName("thing")
        .setFate(HandleProto.Fate.CREATE)
        .setStorageKey(ramdiskStorageKey)
        .build()
    val readConnectionSpec = HandleConnectionSpec("data", Direction.READS, TypeVariable("data"))
    val readerSpec = ParticleSpec("Reader", mapOf("data" to readConnectionSpec), "ReaderLocation")
    val writeConnectionSpec = HandleConnectionSpec("data", Direction.WRITES, TypeVariable("data"))
    val writerSpec = ParticleSpec("Writer", mapOf("data" to writeConnectionSpec), "WriterLocation")
    val readerWriterSpec = ParticleSpec(
        "ReaderWriter",
        mapOf("write" to writeConnectionSpec, "read" to readConnectionSpec),
        "ReaderWriterLocation"
    )
    val context = DecodingContext(
        particleSpecs = mapOf(
            "Reader" to readerSpec, "Writer" to writerSpec, "ReaderWriter" to readerWriterSpec
        ),
        handleProtos = mapOf("thing" to thingHandleProto)
    )

    @Before
    fun setupTest() {
        RamDiskStorageKey.registerParser()
    }

    @Test
    fun handleConnnectionPicksModeFromSpec() {
        var handleConnectionProto = HandleConnectionProto
            .newBuilder()
            .setName("data")
            .setHandle("thing")
            .build()
        // When decoded as part of readerSpec, the mode is [HandleMode.Read].
        val readConnection = handleConnectionProto.decode(readerSpec, context)
        assertThat(readConnection.mode).isEqualTo(HandleMode.Read)
        assertThat(readConnection.type).isEqualTo(TypeVariable("thing"))
        assertThat(readConnection.storageKey).isEqualTo(StorageKeyParser.parse(ramdiskStorageKey))
        // When decoded as part of writerSpec, the mode is [HandleMode.Write].
        val writeConnection = handleConnectionProto.decode(writerSpec, context)
        assertThat(writeConnection.mode).isEqualTo(HandleMode.Write)
        assertThat(writeConnection.type).isEqualTo(TypeVariable("thing"))
        assertThat(writeConnection.storageKey).isEqualTo(StorageKeyParser.parse(ramdiskStorageKey))
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
            .contains("HandleConnectionSpec 'unknown' not found in ParticleSpec 'Reader'")
    }

    @Test
    fun decodeHandleConnectionDetectsMissingHandleProto() {
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
            .contains("HandleProto for 'unknown' not found when decoding ParticleProto 'Writer'")
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
        val particle = particleProto.decode(context)
        val readConnection = readConnectionProto.decode(readerSpec, context)
        assertThat(particle.particleName).isEqualTo("Reader")
        assertThat(particle.location).isEqualTo(readerSpec.location)
        assertThat(particle.handles).isEqualTo(mapOf("data" to readConnection))
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
        val particle = particleProto.decode(context)
        val readConnection = readConnectionProto.decode(readerWriterSpec, context)
        val writeConnection = writeConnectionProto.decode(readerWriterSpec, context)
        assertThat(particle.particleName).isEqualTo("ReaderWriter")
        assertThat(particle.location).isEqualTo(readerWriterSpec.location)
        assertThat(particle.handles)
            .isEqualTo(mapOf("read" to readConnection, "write" to writeConnection))
    }

    @Test
    fun decodesParticleProtoWithNoConnections() {
        val emptyParticleProto = ParticleProto
            .newBuilder()
            .setSpecName("Reader")
            .build()
        val particle = emptyParticleProto.decode(context)
        assertThat(particle.particleName).isEqualTo("Reader")
        assertThat(particle.location).isEqualTo(readerSpec.location)
        assertThat(particle.handles).isEmpty()
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

