/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.tools

import arcs.core.data.proto.ManifestProto
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.arguments.argument
import com.github.ajalt.clikt.parameters.types.file

/** Converts manifest proto binaries to textprotos. */
class InspectManifest : CliktCommand(
  help = """Converts Manifest binaries to textprotos.""",
  printHelpOnEmptyArgs = true
) {

  private val manifest by argument(
    help = "path/to/manifest.binarypb"
  ).file()
  private val outputFile by argument(
    help = "path/to/readable_manifest.textproto"
  ).file()

  override fun run() {
    val manifestProto = ManifestProto.parseFrom(manifest.readBytes())
    outputFile.writeText(manifestProto.toString())
  }
}

fun main(args: Array<String>) = InspectManifest().main(args)
