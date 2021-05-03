/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.tools

import arcs.core.analysis.InformationFlow
import arcs.core.analysis.verify
import arcs.core.data.Annotation
import arcs.core.data.Check
import arcs.core.data.proto.ManifestProto
import arcs.core.data.proto.decodeRecipes
import arcs.core.util.Log
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.arguments.multiple
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.types.file
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * A command line tool to run DFA on a given list of manifest files.
 */
class RunDFA : CliktCommand(
  name = "run_dfa",
  help = """A command line tool to run DFA on a given list of manifest files. 
    
    If the tools is run without the `--binary` flag, the sigh binary must be 
    exported to the `SIGH_CMD` environment variable. For example:
    
      SIGH_CMD=/path/to/sigh run_dfa <file1> <file2> ...,
    """.trimIndent(),
  printHelpOnEmptyArgs = true
) {

  val manifests by argument(help = "<file1> <file2> ...").file().multiple()
  val proto by option(
    "-b",
    "--binary",
    help = "Treat each input manifest as a .binarypb file."
  ).flag(default = false)
  val debug by option(
    "-d",
    "--debug",
    help = "Turn on debug tracing."
  ).flag(default = false)

  override fun run() {
    if (debug) {
      Log.level = Log.Level.Debug
    }
    var sighCmd: String? = null
    if (!proto) {
      sighCmd = System.getenv("SIGH_CMD")
      if (sighCmd == null) {
        echo("Set `SIGH_CMD` environment variable to the sigh command binary.", err = true)
        return
      }
    }

    val dfaRunner = DFARunner(sighCmd)
    manifests.forEach { dfaRunner.verifyChecksInFile(it.path) }
  }
}

/**
 * A helper class to run DFA on a manifest.
 *
 * The [sighCmd] points to the `sigh` tool, which is used to invoke `manifest2proto` on a given
 * manifest to parse and generate the corresponding proto.
 *
 * If [sighCmd] is `null`, it will assume each file is already in .binarypb format.
 */
class DFARunner(val sighCmd: String?) {
  private fun Check.asString(): String {
    return "$accessPath is $predicate"
  }

  private fun manifestToProto(manifestFile: String): ManifestProto {
    if (sighCmd == null) {
      return ManifestProto.parseFrom(File(manifestFile).readBytes())
    }
    val WORKING_DIR = System.getProperty("user.dir")
    val manifestFileAbsolutePath = if (manifestFile.startsWith('/')) {
      manifestFile
    } else {
      "$WORKING_DIR/$manifestFile"
    }
    val tmpDir = System.getProperty("java.io.tmpdir")
    val tmpFile = File
      .createTempFile("tmp", ".binarypb", File(tmpDir))
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
    val manifestProto = manifestToProto(manifestFile)
    val recipes = manifestProto.decodeRecipes()

    val annotatedIngresses = recipes
      .flatMap { it.particles }
      .filter { it.spec.annotations.contains(INGRESS_ANNOTATION) }
      .map { it.spec.name }

    ingresses.addAll(annotatedIngresses)

    if (ingresses.isEmpty()) {
      print("-- No ingresses. Skipping")
      return
    }
    if (recipes.size > 1) {
      print("-- More than one recipe in manifest. Skipping")
      return
    }
    if (recipes.isEmpty()) {
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

  companion object {
    val INGRESS_ANNOTATION = Annotation("ingress", emptyMap())
  }
}

/** A simple class to render colors in console. */
class ConsoleColors {
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

fun main(args: Array<String>) = RunDFA().main(args)
