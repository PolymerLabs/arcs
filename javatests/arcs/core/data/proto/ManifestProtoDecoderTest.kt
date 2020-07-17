package arcs.core.data.proto

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class ManifestProtoDecoderTest {

    private val manifestProto = ManifestProto.newBuilder()
        .addRecipes(RecipeProto.newBuilder()
            .setName("FooRecipe")
            .addParticles(ParticleProto.newBuilder()
                .setSpecName("FooParticle")))
        .addRecipes(RecipeProto.newBuilder()
            .setName("BarRecipe")
            .addParticles(ParticleProto.newBuilder()
                .setSpecName("BarParticle")))
        .addParticleSpecs(ParticleSpecProto.newBuilder()
            .setName("FooParticle")
            .setLocation("here"))
        .addParticleSpecs(ParticleSpecProto.newBuilder()
            .setName("BarParticle")
            .setLocation("there"))
        .build()

    @Test
    fun decodesRecipes() {
        assertThat(manifestProto.decodeRecipes().map { it.name }).containsExactly(
            "FooRecipe", "BarRecipe")
    }

    @Test
    fun decodesParticleSpecs() {
        assertThat(manifestProto.decodeParticleSpecs().map { it.name }).containsExactly(
            "FooParticle", "BarParticle")
    }
}
