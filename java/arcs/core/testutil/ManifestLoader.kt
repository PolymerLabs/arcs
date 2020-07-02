package arcs.core.testutil

import arcs.core.data.proto.ManifestProto
import arcs.repoutils.runfilesDir
import java.io.File

/**
 * Loads a [ManifestProto] from a binary proto file (.pb.bin). Use the `arcs_manifest_proto` BUILD
 * rule to generate the binary proto, and add that to the `data` deps for your test rule.
 *
 * @param path path to a binary proto file (.pb.bin), relative to the repo root (e.g. starting with
 *     "javatests/")
 */
fun loadManifestBinaryProto(path: String): ManifestProto {
    return ManifestProto.parseFrom(File(runfilesDir() + path).readBytes())
}
