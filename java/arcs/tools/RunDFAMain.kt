package arcs.tools

import arcs.core.analysis.InformationFlow
import arcs.core.analysis.verify
import arcs.core.data.Check
import arcs.core.data.proto.ManifestProto
import arcs.core.data.proto.decodeRecipes
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * A command line tool to run DFA on a given list of manifest files. The usage for the command is
 * as follows:
 *     $ SIGH_CMD=/path/to/sigh run_dfa <file1> <file2> ...
 *
 */
fun main(args: Array<String>) {
    if (args.size == 0) {
        print(
            """
              Usage:
                SIGH_CMD=/path/to/sigh run_dfa <file1> <file2> ...
            """.trimIndent()
        )
        return
    }
    val sighCmd: String? = System.getenv("SIGH_CMD")
    if (sighCmd == null) {
        print("Set `SIGH_CMD` environment variable to the sigh command binary.")
        return
    }
    val dfaRunner = DFARunner(sighCmd)
    args.forEach { dfaRunner.verifyChecksInFile(it) }
}

/**
 * A helper class to run DFA on a manifest. The [sighCmd] points to the `sigh` tool, which is used
 * to invoke `manifest2proto` on a given manifest to parse and generate the corresponding proto.
 */
class DFARunner(val sighCmd: String) {
    private fun Check.asString(): String {
        this as Check.Assert
        return "$accessPath is $predicate"
    }

    private fun manifestToProto(manifestFile: String): ManifestProto {
        val WORKING_DIR = System.getProperty("user.dir")
        // File("/usr/local/google/home/bgogul/workspace/cerebra/arcs")
        val manifestFileAbsolutePath = if (manifestFile.startsWith('/')) {
            manifestFile
        } else {
            "$WORKING_DIR/$manifestFile"
        }
        val tmpDir = System.getProperty("java.io.tmpdir")
        val tmpFile = File
            .createTempFile("tmp", ".pb.bin", File(tmpDir))
            .apply { deleteOnExit() }
        val tmpFilePath = tmpFile.getAbsolutePath()
        val sighCommandArgs = listOf(
            sighCmd,
            "manifest2proto",
            manifestFileAbsolutePath,
            "--outfile",
            tmpFile.getName(),
            "--outdir",
            tmpFile.getParent()
        )
        ProcessBuilder(sighCommandArgs)
            .directory(File(WORKING_DIR))
            .redirectOutput(ProcessBuilder.Redirect.INHERIT)
            .redirectError(ProcessBuilder.Redirect.INHERIT)
            .start()
            .waitFor(60, TimeUnit.MINUTES)
        return ManifestProto.parseFrom(File(tmpFilePath).readBytes())
    }

    /** Verifies the checks the given [manifestFile] using DFA. */
    fun verifyChecksInFile(manifestFile: String) {
        val INGRESS_PREFIX = "// #Ingress:"

        print("Verifying $manifestFile")
        // Collect ingresses and failures from the test file.
        val ingresses = mutableListOf<String>()
        File(manifestFile).forEachLine {
            if (it.startsWith(INGRESS_PREFIX, ignoreCase = true)) {
                ingresses.add(it.replace(INGRESS_PREFIX, "", ignoreCase = true).trim())
            }
        }
        if (ingresses.isEmpty()) {
            print("-- No ingresses. Skipping")
            return
        }
        val manifestProto = manifestToProto(manifestFile)
        val recipes = manifestProto.decodeRecipes()
        if (recipes.size > 1) {
            print("-- More than one recipe in manifest. Skipping")
            return
        }
        if (recipes.size == 0) {
            print("-- No recipes in manifest. Skipping")
            return
        }
        val recipe = requireNotNull(recipes.firstOrNull())
        val result = InformationFlow.computeLabels(recipe, ingresses.toList())
        print("${ConsoleColors.showInBlue("[Computed Labels]")}\n")
        print(
            result.fixpoint.toString("$manifestFile") { v, prefix ->
                v.toString(prefix) { i -> "${result.labels[i]}" }
            }
        )
        val actualViolations = result.checks.flatMap { (particle, checks) ->
            checks.filterNot { result.verify(particle, it) }
            .map { it.asString() }
        }
        if (actualViolations.isEmpty()) {
            print("${ConsoleColors.showInGreen("[OK]")} No checks are violated!\n")
        } else {
            print("${ConsoleColors.showInRed("[FAILURE]")} Following checks are violated!\n")
            actualViolations.forEach { print("-- $it\n") }
        }
    }
}

/** A simple class to render colors in console. */
public class ConsoleColors {
    companion object {
        val ESCAPE = '\u001B'
        val RESET = "$ESCAPE[0m"
        val RED = "$ESCAPE[31m"
        val BG_RED = "$ESCAPE[41m"
        val GREEN = "$ESCAPE[32m"
        val BG_GREEN = "$ESCAPE[42m"
        val BLUE = "$ESCAPE[34m"
        val BG_BLUE = "$ESCAPE[44m"
        fun showInRed(text: String) = "$BG_RED$text$RESET"
        fun showInBlue(text: String) = "$BG_BLUE$text$RESET"
        fun showInGreen(text: String) = "$BG_GREEN$text$RESET"
    }
}
