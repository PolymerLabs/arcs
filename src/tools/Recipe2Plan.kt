package arcs.tools

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.multiple
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.file

/** Generates plans from recipes. */
class Recipe2Plan : CliktCommand(
    help = """Generate plans from recipes.
    
    This script reads recipes from a serialized manifest and generates Kotlin `Plan` classes.""",
    printHelpOnEmptyArgs = true
) {

    val outdir by option(help = "output directory; defaults to '.'").file(fileOkay = false)
    val outfile by option(help = "output filename; if omitted").file(folderOkay = false)
    val packageName by option(help = "scope to specified package; default: 'arcs'").default("arcs")
    val manifests by argument(help = "paths to JSON serialized manifests").file(exists = true).multiple()

    override fun run() {
        echo("hello")
    }

}

fun main(args: Array<String>) = Recipe2Plan().main(args)
