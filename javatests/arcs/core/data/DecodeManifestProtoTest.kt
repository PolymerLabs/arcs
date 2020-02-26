package arcs.core.data

import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.TextFormat
import java.io.File
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class DecodeManifestProtoTest {

    @Test
    fun decodesManifestEncodedInTypeScript() {
        val path = runfilesDir() + "java/arcs/core/data/testdata/example.pb.bin"
        val recipe = RecipeEnvelopeProto.parseFrom(File(path).readBytes()).recipe
        assertThat(recipe.name).isEqualTo("PassThrough")
        assertThat(recipe.particlesList.map { it.specName }).containsExactly("Reader", "Writer")
        assertThat(recipe.handlesList.map { it.name }).containsExactly("thing")
    }

    @Test
    fun decodesManifestEncodedInTextFormat() {
        val path = runfilesDir() + "java/arcs/core/data/testdata/example.textproto"
        val builder = RecipeEnvelopeProto.newBuilder()
        TextFormat.getParser().merge(File(path).readText(), builder)
        val recipe = builder.build().recipe
        assertThat(recipe.name).isEqualTo("PassThrough")
        assertThat(recipe.particlesList.map { it.specName }).containsExactly("Reader", "Writer")
        assertThat(recipe.handlesList.map { it.name }).containsExactly("thing")
    }
}
