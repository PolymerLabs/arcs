package arcs.core.data.proto

import arcs.core.data.HandleConnectionSpec
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe.Handle
import arcs.core.data.Recipe.Particle
import arcs.core.data.TypeVariable
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.testutil.assertThrows
import arcs.core.testutil.fail
import arcs.core.util.Result
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.Message.Builder
import com.google.protobuf.Message
import java.io.File
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class RecipeProtoDecoderTest {
    // The test environment.
    var ramdiskStorageKey = "ramdisk://thing"
    val thingHandleProto = HandleProto
        .newBuilder()
        .setName("thing")
        .setFate(HandleProto.Fate.CREATE)
        .setStorageKey(ramdiskStorageKey)
        .build()
    val thingHandle = Handle(
        "thing", Handle.Fate.CREATE, ramdiskStorageKey, TypeVariable("thing"), emptyList()
    )
    val readConnectionSpec = HandleConnectionSpec("data", Direction.READS, TypeVariable("data"))
    val readerSpec = ParticleSpec("Reader", mapOf("data" to readConnectionSpec), "ReaderLocation")
    val writeConnectionSpec = HandleConnectionSpec("data", Direction.WRITES, TypeVariable("data"))
    val writerSpec = ParticleSpec("Writer", mapOf("data" to writeConnectionSpec), "WriterLocation")
    val context = DecodingContext(
        particleSpecs = mapOf("Reader" to readerSpec, "Writer" to writerSpec),
        recipeHandles = mapOf("thing" to thingHandle)
    )
    var dataConnection = HandleConnectionProto
        .newBuilder()
        .setName("data")
        .setHandle("thing")
        .build()
    val readerParticle = ParticleProto
        .newBuilder()
        .setSpecName("Reader")
        .addConnections(dataConnection)
        .build()
    val writerParticle = ParticleProto
        .newBuilder()
        .setSpecName("Writer")
        .addConnections(dataConnection)
        .build()

    /** Defines the following recipe:
     *    recipe PassThrough
     *      thing: create
     *      Writer
     *        data: writes thing
     *      Reader
     *        data: reads thing
     *
     */
    val recipeProto = RecipeProto
        .newBuilder()
        .setName("PassThrough")
        .addHandles(thingHandleProto)
        .addParticles(readerParticle)
        .addParticles(writerParticle)
        .build()

    @Before
    fun setupTest() {
        RamDiskStorageKey.registerParser()
    }

    @Test
    fun decodesRecipe() {
        val recipe = recipeProto.decode(context.particleSpecs)
        assertThat(recipe.name).isEqualTo("PassThrough")
        assertThat(recipe.handles).isEqualTo(mapOf("thing" to thingHandle))
        assertThat(recipe.particles).containsExactly(
            readerParticle.decode(context), writerParticle.decode(context)
        )
    }

    @Test
    fun decodesEmptyRecipe() {
        val emptyRecipeProto = RecipeProto
            .newBuilder()
            .build()
        val emptyRecipe = emptyRecipeProto.decode(context.particleSpecs)
        assertThat(emptyRecipe.name).isEqualTo("")
        assertThat(emptyRecipe.handles).isEmpty()
        assertThat(emptyRecipe.particles).isEmpty()
    }

    @Test
    fun decodeRecipeDetecsDuplicateHandles() {
        val duplicateHandlesRecipeProto = RecipeProto
            .newBuilder()
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
