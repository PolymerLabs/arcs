package arcs.core.tools

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.multiple
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.file
import java.io.File

class Proto2Schema : CliktCommand(
    help = """Generates Schemas and Types from a protobuf-serialized manifest.
    
    This script reads schemas from a serialized manifest and generates Kotlin `Schema` and `Type` classes.""",
    printHelpOnEmptyArgs = true
) {

    val outdir by option(help = "output directory; defaults to '.'").file(fileOkay = false)
    val outfile by option(help = "output filename; if omitted")
    val packageName by option(help = "scope to specified package; default: 'arcs'").default("arcs")
    val protos by argument(help = "paths to protobuf-serialized manifests")
        .file(exists = true).multiple()

    /** Mock Proto2Schema: So far, this is equivalent to copy. */
    override fun run() {
        protos.forEach { protoFile ->
            val outFile = outputFile(protoFile)
            echo("$protoFile --> $outFile")
            outFile.writeBytes(protoFile.readBytes())
        }
    }

    /** Produces a File object per user specification, or with default values. */
    fun outputFile(inputFile: File): File {
        val outputName = outfile ?: inputFile.nameWithoutExtension + ".kt"
        val outputPath = outdir ?: System.getProperty("user.dir")
        return File("$outputPath/$outputName")
    }

}

fun main(args: Array<String>) = Proto2Schema().main(args)
