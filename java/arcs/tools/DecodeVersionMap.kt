package arcs.tools

import arcs.android.crdt.VersionMapProto
import arcs.android.crdt.fromProto
import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.parameters.options.option
import com.github.ajalt.clikt.parameters.options.required
import java.util.Base64

class DecodeVersionMap : CliktCommand(
  name = "decode_version_map",
  help = "Decodes a base64-encoded version map proto (e.g. as stored in the SQLite database)."
) {
  private val encoding by option("-e", help = "The base64 string to decode").required()

  override fun run() {
    val decoder = Base64.getDecoder()
    val bytes = decoder.decode(encoding)
    val proto = VersionMapProto.parseFrom(bytes)
    val versionMap = fromProto(proto)
    println(versionMap)
  }
}

fun main(args: Array<String>) = DecodeVersionMap().main(args)
