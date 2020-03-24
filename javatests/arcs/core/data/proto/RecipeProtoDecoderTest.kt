package arcs.core.data.proto

import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe.Handle
import arcs.core.data.Recipe.Particle
import arcs.core.data.Schema
import arcs.core.data.SchemaName
import arcs.core.data.SchemaFields
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
class RecipeProtoDecoderTest {
    // The test environment.
    var ramdiskStorageKey = "ramdisk://thing"
    val thingHandleProto = HandleProto.newBuilder()
        .setName("thing")
        .setFate(HandleProto.Fate.CREATE)
        .setStorageKey(ramdiskStorageKey)
        .build()
    val thingHandle = Handle(
        "thing", Handle.Fate.CREATE, ramdiskStorageKey, TypeVariable("thing"), emptyList()
    )
    val thingSchema = Schema(
            names = listOf(SchemaName("Thing")),
            fields = SchemaFields(singletons=mapOf("name" to FieldType.Text), collections=mapOf()),
            hash = ""
    )
    val thingEntity = EntityType(thingSchema)
    val readConnectionSpec = HandleConnectionSpec("data", Direction.READS, thingEntity)
    val readerSpec = ParticleSpec("Reader", mapOf("data" to readConnectionSpec), "ReaderLocation")
    val writeConnectionSpec = HandleConnectionSpec("data", Direction.WRITES, thingEntity)
    val writerSpec = ParticleSpec("Writer", mapOf("data" to writeConnectionSpec), "WriterLocation")
    val context = DecodingContext(
        particleSpecs = listOf(readerSpec, writerSpec).associateBy { it.name },
        recipeHandles = listOf(thingHandle).associateBy { it.name }
    )
    var dataConnection = HandleConnectionProto.newBuilder()
        .setName("data")
        .setHandle("thing")
        .build()
    val readerParticle = ParticleProto.newBuilder()
        .setSpecName("Reader")
        .addConnections(dataConnection)
        .build()
    val writerParticle = ParticleProto.newBuilder()
        .setSpecName("Writer")
        .addConnections(dataConnection)
        .build()

    /**
     * Defines the following recipe:
     *    recipe PassThrough
     *      thing: create
     *      Writer
     *        data: writes thing
     *      Reader
     *        data: reads thing
     */
    val recipeProto = RecipeProto.newBuilder()
        .setName("PassThrough")
        .addHandles(thingHandleProto)
        .addParticles(readerParticle)
        .addParticles(writerParticle)
        .build()

    @Test
    fun decodesRecipe() {
        with(recipeProto.decode(context.particleSpecs)) {
            assertThat(name).isEqualTo("PassThrough")
            assertThat(handles).isEqualTo(mapOf("thing" to thingHandle))
            assertThat(particles).containsExactly(
                readerParticle.decode(context),
                writerParticle.decode(context)
            )
        }
    }

    @Test
    fun decodesEmptyRecipe() {
        val emptyRecipeProto = RecipeProto.newBuilder()
            .build()
        with(emptyRecipeProto.decode(context.particleSpecs)) {
            assertThat(name).isEqualTo("")
            assertThat(handles).isEmpty()
            assertThat(particles).isEmpty()
        }
    }

    @Test
    fun decodeRecipeDetectsDuplicateHandles() {
        val duplicateHandlesRecipeProto = RecipeProto.newBuilder()
            .setName("Duplicates")
            .addHandles(thingHandleProto)
            .addHandles(thingHandleProto)
            .build()
        val exception = assertThrows(IllegalArgumentException::class) {
            duplicateHandlesRecipeProto.decode(context.particleSpecs)
        }
        assertThat(exception).hasMessageThat().contains(
            "Duplicate handle 'thing' when decoding recipe 'Duplicates'."
        )
    }

    @Test
    fun decodesRecipeEnvelope() {
        val path = runfilesDir() + "java/arcs/core/data/testdata/example.textproto"
        val builder = RecipeEnvelopeProto.newBuilder()
        TextFormat.getParser().merge(File(path).readText(), builder)
        val recipeEnvelopeProto = builder.build()
        with(recipeEnvelopeProto.decodeRecipe()) {
            assertThat(particles.map { it.spec.name }).containsExactly("Reader", "Writer")
            assertThat(particles).containsExactly(
                readerParticle.decode(context),
                writerParticle.decode(context)
            )
        }
    }
}
