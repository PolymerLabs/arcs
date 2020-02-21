package arcs.core.tools

import arcs.core.data.*
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.multiple
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.file
import com.squareup.kotlinpoet.*
import com.squareup.kotlinpoet.ParameterizedTypeName.Companion.parameterizedBy
import kotlinx.coroutines.yield

import java.io.File

/** Generates plans from recipes. */
class Recipe2Plan : CliktCommand(
    help = """Generate plans from recipes.
    
    This script reads recipes from a serialized manifest and generates Kotlin `Plan` classes.""",
    printHelpOnEmptyArgs = true
) {
    val outdir by option(help = "output directory; defaults to '.'").file(fileOkay = false)
    val outfile by option(help = "output filename; if omitted")
    val packageName by option(help = "scope to specified package; default: 'arcs'").default("arcs")
    val manifests by argument(help = "paths to JSON serialized manifests")
        .file(exists = true).multiple()

    private val listOfMethod = MemberName("kotlin.collections", "listOf")
    private val mapOfMethod = MemberName("kotlin.collections", "mapOf")

    override fun run() {
        manifests.forEach { manifest ->
            val outputFile = outputFile(manifest)
            echo("$manifest --> $outputFile")

            val serializedManifest = parse(manifest.readText())
            val fileBuilder = FileSpec.builder(packageName, "")

            generate(serializedManifest, fileBuilder)

            outputFile.writeText(fileBuilder.build().toString())
        }
    }

    fun generate(manifest: SerializedManifest, fileBuilder: FileSpec.Builder) {
        // Ask Ray: do we need plans to be instances or classes?

        val schemasObjectBuilder = TypeSpec.objectBuilder("Schemas")
            .addProperties(generateSchemas(manifest.schemas))

        fileBuilder.addType(schemasObjectBuilder.build())

        generatePlans(manifest.recipes).forEach {
            fileBuilder.addType(it.build())
        }
    }

    fun generatePlans(recipes: List<Recipe>): Iterable<TypeSpec.Builder> {
        val particleSpecClass = ClassName("arcs.core.data.Plan", "Particle")
        val listOfParticleSpecs = LIST.parameterizedBy(particleSpecClass)
        return recipes.map {

            // Create ParticleSpecs
            val particleSpecProperty = PropertySpec.builder("particles", listOfParticleSpecs)
                .initializer("%M()", listOfMethod) // TODO: Instantiate list of particle specs
                .build()

            val planCompanionBuilder = TypeSpec.companionObjectBuilder()
                .addProperty(particleSpecProperty)

            val planBuilder = TypeSpec.classBuilder("${it.name}Plan")
                .addType(planCompanionBuilder.build())
                .superclass(Plan::class)
                .addSuperclassConstructorParameter("%N", particleSpecProperty)

            planBuilder
        }
    }

    fun formatName(name: String): String {
        return name[0].toLowerCase() + name.substring(1)
    }

    fun generateSchemas(schemas: List<Schema>): Iterable<PropertySpec> {
        var anons = 0
        val schemaClass = ClassName("arcs.core.data", "Schema")
        val schemaNameClass = ClassName("arcs.core.data", "SchemaName")
        val schemaFieldsClass = ClassName("arcs.core.data", "SchemaFields")
        return schemas.map {
            PropertySpec.builder("${formatName(it.name?.name ?: "anon${++anons}")}Schema", Schema::class)
                .initializer(CodeBlock.builder()
                    .addStatement("%T(", schemaClass)
                    .indent()
                    .addStatement("%M(", listOfMethod)
                    .indent()
                    .apply {
                        it.names.forEachIndexed { index, name ->
                            if (index > 0) addStatement(",%T(%S)", schemaNameClass, name.name)
                            else addStatement("%T(%S)", schemaNameClass, name.name)
                        }
                    }
                    .unindent()
                    .addStatement("),")
                    .addStatement("%T(", schemaFieldsClass)
                    .indent()
                    .addStatement("singletons = %M(", mapOfMethod)
                    .indent()
                    .apply {
                        val entries = it.fields.singletons.entries
                        entries.forEachIndexed { index, entry ->
                            when (entry.value.tag) {
                                FieldType.Tag.EntityRef -> add("%S to %T(%S)", entry.key, FieldType.EntityRef::class, (entry.value as FieldType.EntityRef).schemaHash)
                                FieldType.Tag.Primitive -> add("%S to %T.%L", entry.key, FieldType::class, (entry.value as FieldType.Primitive).primitiveType)
                            }
                            if (index != entries.size - 1) add(",")
                            add("\n")
                        }
                    }
                    .unindent()
                    .addStatement("),")
                    .addStatement("collections = %M(", mapOfMethod)
                    .indent()
                    .apply {
                        val entries = it.fields.collections.entries
                        entries.forEachIndexed { index, entry ->
                            when (entry.value.tag) {
                                FieldType.Tag.EntityRef -> add("%S to %T(%S)", entry.key, FieldType.EntityRef::class, (entry.value as FieldType.EntityRef).schemaHash)
                                FieldType.Tag.Primitive -> add("%S to %T.%L", entry.key, FieldType::class, (entry.value as FieldType.Primitive).primitiveType)
                            }
                            if (index != entries.size - 1) add(",")
                            add("\n")
                        }
                    }
                    .unindent()
                    .addStatement(")")
                    .unindent()
                    .addStatement("),")
                    .addStatement("%S", it.hash)
                    .addStatement(")")
                    .build())
                .build()
        }
    }

    /** Produces a File object per user specification, or with default values. */
    fun outputFile(manifest: File): File {
        val outputName = outfile ?: manifest.nameWithoutExtension + ".kt"
        val outputPath = outdir ?: System.getProperty("user.dir")
        return File("$outputPath/$outputName")
    }

}

data class Recipe(
    val name: String,
    val particles: List<Plan.Particle>
)

data class SerializedManifest(
    val recipes: List<Recipe>,
//    val particles: List<ParticleSpec>,
    val schemas: List<Schema>
)

fun parse(jsonString: String): SerializedManifest {
//    val gson = Gson()
//    return gson.fromJson(jsonString, SerializedManifest::class.java)
    val sliceSchema = Schema(
        listOf(SchemaName("Slice")),
        SchemaFields(
            singletons = mapOf(
                "num" to FieldType.Number,
                "flg" to FieldType.Boolean,
                "txt" to FieldType.Text
            ),
            collections = mapOf()
        ),
        "f4907f97574693c81b5d62eb009d1f0f209000b8"
    )

    val sliceEntity = EntityType(sliceSchema)
    val sliceCollection = CollectionType(sliceEntity)
    return SerializedManifest(
        listOf(
            Recipe(
                "EntitySlicingTest",
                listOf(
                    Plan.Particle(
                        "EntitySlicingTest",
                        "src/wasm/tests/\$module.wasm",
                        mapOf(
                            "s1" to Plan.HandleConnection(null, sliceEntity),
                            "s2" to Plan.HandleConnection(null, sliceEntity),
                            "c1" to Plan.HandleConnection(null, sliceCollection)
                        )

                    )
                )
            )
        ),
        listOf(sliceSchema)
    )
}


fun main(args: Array<String>) = Recipe2Plan().main(args)
