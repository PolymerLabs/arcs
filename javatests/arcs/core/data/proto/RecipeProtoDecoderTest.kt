package arcs.core.data.proto

import arcs.core.data.Capabilities
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe.Handle
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.TypeVariable
import arcs.core.testutil.assertThrows
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.io.File

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
        "thing", Handle.Fate.CREATE, TypeVariable("thing"), ramdiskStorageKey, Capabilities.Empty
    )
    val thingSchema = Schema(
            names = setOf(SchemaName("Thing")),
            fields = SchemaFields(singletons=mapOf("name" to FieldType.Text), collections=mapOf()),
            hash = ""
    )
    val thingEntity = EntityType(thingSchema)
    val readConnectionSpec = HandleConnectionSpec("data", HandleMode.Read, thingEntity)
    val readerSpec = ParticleSpec("Reader", mapOf("data" to readConnectionSpec), "ReaderLocation")
    val writeConnectionSpec = HandleConnectionSpec("data", HandleMode.Write, thingEntity)
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
     *    @trigger
     *      arcId pass-through-arc
     *    recipe PassThrough
     *      thing: create
     *      Writer
     *        data: writes thing
     *      Reader
     *        data: reads thing
     */
    val recipeProto = RecipeProto.newBuilder()
        .setName("PassThrough")
        .setArcId("pass-through-arc")
        .addHandles(thingHandleProto)
        .addParticles(readerParticle)
        .addParticles(writerParticle)
        .build()

    @Test
    fun decodesRecipe() {
        with(recipeProto.decode(context.particleSpecs)) {
            assertThat(name).isEqualTo("PassThrough")
            assertThat(arcId).isEqualTo("pass-through-arc")
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
            assertThat(name).isNull()
            assertThat(arcId).isNull()
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
}
