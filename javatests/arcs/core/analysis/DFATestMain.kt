package arcs.core.analysis

import arcs.core.data.Check
import arcs.core.data.proto.ManifestProto
import arcs.core.data.proto.decodeRecipes
import java.io.File
import java.util.concurrent.TimeUnit

fun main(args: Array<String>) {
    if (args.size == 0) {
        print("Usage: run_dfa <file1> <file2> ...")
        return
    }
    args.forEach { verifyChecksInFile(it) }
}

fun Check.asString(): String {
    this as Check.Assert
    return "${accessPath} is $predicate"
}

fun manifestToProto(manifestFile: String): ManifestProto {
    val WORKING_DIR = File("/usr/local/google/home/bgogul/workspace/cerebra/arcs")
    val manifestFileAbsolutePath = if (manifestFile.startsWith('/')) {
        manifestFile
    } else {
        System.getProperty("user.dir") + "/$manifestFile"
    }
    val tmpDir = System.getProperty("java.io.tmpdir")
    val tmpFile = File
        .createTempFile("tmp", ".pb.bin", File(tmpDir))
        .apply { deleteOnExit() }
    val tmpFilePath = tmpFile.getAbsolutePath()
    val sighCommandArgs = listOf(
        "tools/sigh",
        "manifest2proto",
        manifestFileAbsolutePath,
        "--outfile",
        tmpFile.getName(),
        "--outdir",
        tmpFile.getParent()
    )
    ProcessBuilder(sighCommandArgs)
        .directory(WORKING_DIR)
        .redirectOutput(ProcessBuilder.Redirect.INHERIT)
        .redirectError(ProcessBuilder.Redirect.INHERIT)
        .start()
        .waitFor(60, TimeUnit.MINUTES)
    return ManifestProto.parseFrom(File(tmpFilePath).readBytes())
}

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

fun verifyChecksInFile(manifestFile: String) {
    val INGRESS_PREFIX = "// #Ingress:"
    val FAIL_PREFIX = "// #Fail:"
    val OK_PREFIX = "// #OK"

    print("Verifying ${manifestFile}")
    // Collect ingresses and failures from the test file.
    val ingresses = mutableListOf<String>()
    val violations = mutableListOf<String>()
    var hasOk = false
    File(manifestFile).forEachLine {
        when {
            it.startsWith(INGRESS_PREFIX, ignoreCase = true) ->
                ingresses.add(it.replace(INGRESS_PREFIX, "", ignoreCase = true).trim())
            it.startsWith(FAIL_PREFIX, ignoreCase = true) ->
                violations.add(it.replace(FAIL_PREFIX, "", ignoreCase = true).trim())
            it.startsWith(OK_PREFIX, ignoreCase = true) -> hasOk = true
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
