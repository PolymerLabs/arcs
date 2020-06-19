package arcs.core.data.proto

import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import java.io.File
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ParseManifestProtoTest {

    /**
     * On the TypeScript side we serialize .arcs file and validate it equals the .pb.bin file.
     * On the Kotlin side we deserialize .pb.bin and validate it equals parsed .textproto file.
     */
    @Test
    fun parsesSerializedManifestProto() {
        val binPath = runfilesDir() + "java/arcs/core/data/testdata/Manifest2ProtoTest.pb.bin"
        val manifestBin = ManifestProto.parseFrom(File(binPath).readBytes())

        val txtPath = runfilesDir() + "java/arcs/core/data/testdata/Manifest2ProtoTest.textproto"
        val manifestTxt = ManifestProto.newBuilder()
        TextFormat.getParser().merge(File(txtPath).readText(), manifestTxt)
        assertThat(manifestTxt.build()).isEqualTo(manifestBin)
    }

    @Test
    fun decodesQueryExampleInTextFormat() {
        val path = runfilesDir() + "java/arcs/core/data/testdata/query.textproto"
        TextFormat.getParser().merge(File(path).readText(), ManifestProto.newBuilder())
    }
}
