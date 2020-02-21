package arcs.core.tools

import arcs.core.data.*
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.multiple
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.file
import com.squareup.kotlinpoet.FileSpec
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
        //TODO Implement
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
    val particles: List<ParticleSpec>
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
            SchemaDescription(),
            "f4907f97574693c81b5d62eb009d1f0f209000b8"
        )
    val sliceEntity = EntityType(sliceSchema)
    val sliceCollection = CollectionType(sliceEntity)
    return SerializedManifest(
        listOf(
            Recipe(
                "EntitySlicingTest",
                listOf(
                    ParticleSpec(
                        "EntitySlicingTest",
                        "src/wasm/tests/\$module.wasm",
                        mapOf(
                            "s1" to HandleConnectionSpec(null, sliceEntity),
                            "s2" to HandleConnectionSpec(null, sliceEntity),
                            "c1" to HandleConnectionSpec(null, sliceCollection)
                        )

                    )
                )
            )
        ),
        listOf(sliceSchema)
    )
}

fun main(args: Array<String>) = Recipe2Plan().main(args)
