package arcs.tools

import arcs.core.data.proto.ManifestProto
import arcs.core.data.proto.decodeRecipes
import arcs.core.storage.api.DriverAndKeyConfigurator
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.options.required
import com.github.ajalt.clikt.parameters.types.file
import com.squareup.kotlinpoet.FileSpec

/** Generates plans from recipes. */
class Recipe2Plan : CliktCommand(
    help = """Generate plans from recipes.
    
    This script reads serialized manifests and generates Kotlin files with [Plan] classes.""",
    printHelpOnEmptyArgs = true
) {
    private val manifest by argument(
        help = "path to protobuf-serialized manifest, i.e. '*.bin.pb'"
    ).file(exists = true, readable = true)
    private val outputFile by argument(help = "output Kotlin filepath, e.g. 'path/to/File.kt'")
        .file()
    // TODO(b/161994250): Package should be derived from proto
    private val packageName by option(help = "scope to specified package").required()
    private val verbose by option("--verbose", "-v", help = "Print logs").flag(default = false)
    // TODO(b/162273478) CLI should accept `policies` argument

    /** Execute: Generate a plan per input manifest proto */
    override fun run() {
        if (verbose) {
            echo("$manifest --> $outputFile")
        }
        DriverAndKeyConfigurator.configure(null)
        val fileBuilder = FileSpec.builder(packageName, "")
            .addComment("""
                |GENERATED CODE -- DO NOT EDIT
                |
                |TODO(b/161941018): Improve whitespace / formatting.
            """.trimMargin())

        val manifestProto = ManifestProto.parseFrom(manifest.readBytes())
        manifestProto.decodeRecipes()
            .filter { it.name != null }
            .fold(fileBuilder) { builder, recipe -> builder.addRecipe(recipe) }

        outputFile.writeText(fileBuilder.build().toString())
    }
}

fun main(args: Array<String>) = Recipe2Plan().main(args)
