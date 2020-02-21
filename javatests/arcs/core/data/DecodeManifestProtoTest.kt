package arcs.core.data

import arcs.core.data.Manifest
import com.google.common.truth.Truth.assertThat
import org.junit.Ignore
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
    @Ignore // Broken internally.
    fun decodesEncodedManifest() {
        // TODO: Hardcoding this path causes it to fail internally.
        val bytes = File("java/arcs/core/data/testdata/example.pb.bin").readBytes()

        val manifest = Manifest.parseFrom(bytes);
        assertThat(manifest.recipesList).hasSize(1)

        val recipe = manifest.getRecipes(0)
        assertThat(recipe.name).isEqualTo("PassThrough")
        assertThat(recipe.particlesList).containsExactly("Reader", "Writer")
        assertThat(recipe.handlesList).containsExactly("thing")
    }
}
