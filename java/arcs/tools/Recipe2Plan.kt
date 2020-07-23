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
    val outdir by option(help = "output directory; defaults to '.'").file(fileOkay = false)
    // TODO(161994250): Package should be derived from proto
    val packageName by option(help = "scope to specified package; default: 'arcs'").default("arcs")
    val manifests by argument(help = "paths to protobuf-serialized manifests")
        .file(exists = true).multiple()
    val verbose by option("--verbose", "-v", help = "Print logs").flag(default = false)

    /** Execute: Generate a plan per input manifest proto */
    override fun run() = manifests.forEach { manifest ->
        DriverAndKeyConfigurator.configure(null)

        val outputFile = outputFile(manifest)
        if (verbose) {
            echo("$manifest --> $outputFile")
        }

        val fileBuilder = FileSpec.builder(packageName, "")

        fileBuilder.addComment("GENERATED CODE -- DO NOT EDIT")

        // TODO: Generate Plans
        // val manifestProto = ManifestProto.parseFrom(manifest.readBytes())

        outputFile.writeText(fileBuilder.build().toString())
    }

    /** Produces a File object per user specification, or with default values. */
    private fun outputFile(manifest: File): File {
        val outputName = manifest.name.replace(".pb.bin", ".jvm.kt")
        val outputPath = outdir ?: System.getProperty("user.dir")
        return File("$outputPath/$outputName")
    }
}

fun main(args: Array<String>) = Recipe2Plan().main(args)
