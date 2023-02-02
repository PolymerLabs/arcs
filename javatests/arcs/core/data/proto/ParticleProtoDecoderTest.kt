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
        refinement: "true"
        query: "true"
      }
    }
    """.trimIndent()
  )
  val thingType = EntityType(
    Schema(
      names = setOf(SchemaName("Thing")),
      fields = SchemaFields(
        singletons = mapOf("name" to FieldType.Text),
        collections = emptyMap()
      ),
      hash = ""
    )
  )
  val readConnectionSpec = HandleConnectionSpec("read", HandleMode.Read, TypeVariable("data"))
  val readerSpec = ParticleSpec("Reader", mapOf("read" to readConnectionSpec), "ReaderLocation")
  val writeConnectionSpec = HandleConnectionSpec("write", HandleMode.Write, TypeVariable("data"))
  val writerSpec = ParticleSpec("Writer", mapOf("write" to writeConnectionSpec), "WriterLocation")
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
  fun decodesHandleConnection() {
    var handleConnectionProto = HandleConnectionProto
      .newBuilder()
      .setName("read")
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
  fun roundTripHandleConnection() {
    var handleConnectionProto = HandleConnectionProto
      .newBuilder()
      .setName("read")
      .setHandle("thing")
      .setType(thingTypeProto)
      .build()
    // When decoded as part of readerSpec, the mode is [HandleMode.Read].
    assertRoundTrip(handleConnectionProto, context, readerSpec)
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
      .setName("write")
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
      .setName("read")
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
      .setName("read")
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
  fun roundTripParticleProto() {
    val readConnectionProto = HandleConnectionProto
      .newBuilder()
      .setName("read")
      .setHandle("thing")
      .setType(thingTypeProto)
      .build()
    val particleProto = ParticleProto
      .newBuilder()
      .setSpecName("Reader")
      .addConnections(readConnectionProto)
      .build()
    assertRoundTrip(readConnectionProto, context, readerSpec)
    assertRoundTrip(particleProto, context)
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
  fun roundTripParticleProtoWithMultipleConnections() {
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

    assertRoundTrip(readConnectionProto, context, readerWriterSpec)
    assertRoundTrip(writeConnectionProto, context, readerWriterSpec)
    assertRoundTrip(particleProto, context)
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
  fun roundTripParticleProtoWithNoConnections() {
    val emptyParticleProto = ParticleProto
      .newBuilder()
      .setSpecName("Reader")
      .build()
    assertRoundTrip(emptyParticleProto, context)
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

  companion object {

    private fun assertRoundTrip(proto: ParticleProto, context: DecodingContext) {
      assertThat(proto.decode(context).encode()).isEqualTo(proto)
    }

    private fun assertRoundTrip(
      proto: HandleConnectionProto,
      context: DecodingContext,
      spec: ParticleSpec
    ) {
      assertThat(proto.decode(spec, context).encode()).isEqualTo(proto)
    }
  }
}
