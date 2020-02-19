package arcs.core.data

import arcs.core.data.Manifest
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.io.File

@RunWith(JUnit4::class)
class DecodeManifestProtoTest {

    /**
     * Validate that decoding of the proto encoded in JS works. Proto not final!
     */
    @Test
    fun decodesEncodedManifest() {
        val bytes = File("src/tools/tests/test-data/example.pb.bin").readBytes()

        val manifest = Manifest.parseFrom(bytes);
        assertThat(manifest.recipesList).hasSize(1)

        val recipe = manifest.getRecipes(0)
        assertThat(recipe.name).isEqualTo("PassThrough")
        assertThat(recipe.particlesList).containsExactly("Reader", "Writer")
        assertThat(recipe.handlesList).containsExactly("thing")
    }
}
