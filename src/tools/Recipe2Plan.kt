package arcs.tools

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.multiple
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.file
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
            outputFile(manifest).writeText(manifest.readText())
        }
    }

    /** Produces a File object per user specification, or with default values. */
    fun outputFile(manifest: File): File {
        val outputName = outfile ?: manifest.nameWithoutExtension + ".kt"
        val outputPath = outdir ?: System.getProperty("user.dir")
        return File("$outputPath/$outputName")
    }

}

fun main(args: Array<String>) = Recipe2Plan().main(args)
