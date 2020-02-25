package arcs.core.data

import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import java.io.File
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class DecodeManifestProtoTest {

    /**
     * Validate that decoding of the proto encoded in JS works.
     */
    @Test
    fun decodesEncodedManifest() {
        val path = runfilesDir() + "java/arcs/core/data/testdata/example.pb.bin"
        val recipe = RecipeEnvelopeProto.parseFrom(File(path).readBytes()).recipe
        assertThat(recipe.name).isEqualTo("PassThrough")
        assertThat(recipe.particlesList.map {it.specName}).containsExactly("Reader", "Writer")
        assertThat(recipe.handlesList.map {it.name}).containsExactly("thing")
    }
}
