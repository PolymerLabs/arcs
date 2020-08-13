package arcs.tools

import arcs.core.storage.api.DriverAndKeyConfigurator
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.multiple
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.file
import com.squareup.kotlinpoet.FileSpec
import java.io.File

/** Generates plans from recipes. */
class Recipe2Plan : CliktCommand(
    help = """Generate plans from recipes.
    
    This script reads serialized manifests and generates Kotlin files with [Plan] classes.""",
    printHelpOnEmptyArgs = true
) {
    private val outputFile by argument(help = "output Kotlin filepath, e.g. path/to/File.kt")
        .file(exists = true)
    // TODO(b/161994250): Package should be derived from proto
    private val packageName by argument(help = "scope to specified package; default: 'arcs'")
    private val manifests by argument(help = "paths to protobuf-serialized manifests")
        .file(exists = true).multiple()
    private val verbose by option("--verbose", "-v", help = "Print logs").flag(default = false)
    // TODO(b/162273478) CLI should accept `policies` argument

    /** Execute: Generate a plan per input manifest proto */
    override fun run() = manifests.forEach { manifest ->
        DriverAndKeyConfigurator.configure(null)

        if (verbose) {
            echo("$manifest --> $outputFile")
        }

        val fileBuilder = FileSpec.builder(packageName, "")

        fileBuilder.addComment("GENERATED CODE -- DO NOT EDIT")

        // TODO: Generate Plans
        // val manifestProto = ManifestProto.parseFrom(manifest.readBytes())

        outputFile.writeText(fileBuilder.build().toString())
    }
}

fun main(args: Array<String>) = Recipe2Plan().main(args)
