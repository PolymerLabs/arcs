package arcs.core.data.proto

import arcs.core.data.Annotation
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
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4


/** Creates and [arcId] [AnnotationProto]. */
fun arcIdAnnotationProto(id: String): AnnotationProto {
    return AnnotationProto.newBuilder()
        .setName("arcId")
        .addParams(
            AnnotationParamProto.newBuilder().setName("id").setStrValue(id)
        )
        .build()
}

@RunWith(JUnit4::class)
class RecipeProtoDecoderTest {
    // The test environment.
    val ramdiskStorageKey = "ramdisk://"
    val thingTypeProto = parseTypeProtoText("""
       entity {
         schema {
           names: "Thing"
           fields {
             key: "name"
             value: { primitive: TEXT }
           }
         }
       } 
    """.trimIndent())
    val thingHandleProto = HandleProto.newBuilder()
        .setName("thing")
        .setFate(HandleProto.Fate.CREATE)
        .setStorageKey(ramdiskStorageKey + "thing")
        .build()
    val thingHandle = Handle(
        "thing",
        Handle.Fate.CREATE,
        TypeVariable("thing"),
        ramdiskStorageKey + "thing",
        emptyList()
    )
    val thingSchema = Schema(
        names = setOf(SchemaName("Thing")),
        fields = SchemaFields(singletons = mapOf("name" to FieldType.Text), collections = mapOf()),
        hash = ""
    )
    val thingEntity = EntityType(thingSchema)
    val thangHandleProto = HandleProto.newBuilder()
        .setName("thang")
        .setFate(HandleProto.Fate.MAP)
        .setStorageKey(ramdiskStorageKey + "thang")
        .build()
    val thangHandle = Handle(
        "thang",
        Handle.Fate.MAP,
        TypeVariable("thang"),
        ramdiskStorageKey + "thang",
        emptyList()
    )
    val joinHandleProto = HandleProto.newBuilder()
        .setName("pairs")
        .setFate(HandleProto.Fate.JOIN)
        .addAssociatedHandles("thing")
        .addAssociatedHandles("thang")
        .setStorageKey(ramdiskStorageKey + "pairs")
        .build()
    val joinHandle = Handle(
        "pairs",
        Handle.Fate.JOIN,
        TypeVariable("pairs"),
        ramdiskStorageKey + "pairs",
        emptyList(),
        associatedHandles = mutableListOf(thingHandle, thangHandle)
    )
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
        .setType(thingTypeProto)
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
     *    @arcId('pass-through-arc')
     *    recipe PassThrough
     *      thing: create
     *      Writer
     *        data: writes thing
     *      Reader
     *        data: reads thing
     */
    val recipeProto = RecipeProto.newBuilder()
        .setName("PassThrough")
        .addAnnotations(arcIdAnnotationProto("pass-through-arc"))
        .addHandles(thingHandleProto)
        .addParticles(readerParticle)
        .addParticles(writerParticle)
        .build()

    val recipeWithJoin = RecipeProto.newBuilder()
        .setName("WithJoin")
        .addAnnotations(arcIdAnnotationProto("arc-with-join"))
        .addHandles(thingHandleProto)
        .addHandles(thangHandleProto)
        .addHandles(joinHandleProto)
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
            assertThat(annotations).isEqualTo(listOf(Annotation.createArcId("pass-through-arc")))
        }
    }

    @Test
    fun decodesEmptyRecipe() {
        val emptyRecipeProto = RecipeProto.newBuilder()
            .build()
        with(emptyRecipeProto.decode(context.particleSpecs)) {
            assertThat(name).isNull()
            assertThat(handles).isEmpty()
            assertThat(particles).isEmpty()
            assertThat(annotations).isEmpty()
        }
    }

    @Test
    fun decodeRecipeDetectsDuplicateHandles() {
        val duplicateHandlesRecipeProto = RecipeProto.newBuilder()
            .setName("Duplicates")
            .addHandles(thingHandleProto)
            .addHandles(thingHandleProto)
            .build()
        val exception = assertFailsWith<IllegalArgumentException> {
            duplicateHandlesRecipeProto.decode(context.particleSpecs)
        }
        assertThat(exception).hasMessageThat().contains(
            "Duplicate handle 'thing' when decoding recipe 'Duplicates'."
        )
    }

    @Test
    fun decodeRecipeWithJoins() {
        with(recipeWithJoin.decode(context.particleSpecs)) {
            assertThat(name).isEqualTo("WithJoin")
            assertThat(handles).isEqualTo(
                mapOf(
                    "thing" to thingHandle,
                    "thang" to thangHandle,
                    "pairs" to joinHandle
                )
            )
            assertThat(annotations).isEqualTo(listOf(Annotation.createArcId("arc-with-join")))
        }
    }
}
