package arcs.core.data

import arcs.core.data.RecipeEnvelopeProto
import com.google.common.truth.Truth.assertThat
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.io.File

@RunWith(JUnit4::class)
class DecodeManifestProtoTest {

    /**
     * Validate that decoding of the proto encoded in JS works.
     */
    @Test
    @Ignore // Broken internally.
    fun decodesEncodedManifest() {
        // TODO: Hardcoding this path causes it to fail internally.
        val bytes = File("java/arcs/core/data/testdata/example.pb.bin").readBytes()
        val recipe = RecipeEnvelopeProto.parseFrom(bytes).recipe
        assertThat(recipe.name).isEqualTo("PassThrough")
        assertThat(recipe.particlesList.map {it.specName}).containsExactly("Reader", "Writer")
        assertThat(recipe.handlesList.map {it.name}).containsExactly("thing")
    }
}
