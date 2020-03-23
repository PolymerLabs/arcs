package arcs.core.analysis

import arcs.core.data.proto.RecipeEnvelopeProto
import arcs.core.data.proto.decodeRecipe
import arcs.core.data.Recipe
import arcs.repoutils.runfilesDir
import com.google.common.truth.Truth.assertThat
import com.google.protobuf.Message.Builder
import com.google.protobuf.Message
import com.google.protobuf.TextFormat
import java.io.File
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class TypeInferenceTest {
    @Test
    fun typeInference() {
        val path = runfilesDir() + "java/arcs/core/data/testdata/example.textproto"
        val builder = RecipeEnvelopeProto.newBuilder()
        TextFormat.getParser().merge(File(path).readText(), builder)
        val recipeEnvelopeProto: RecipeEnvelopeProto = builder.build()
        val recipe: Recipe = recipeEnvelopeProto.decodeRecipe()
        runTypeInference(recipe)
    }
}
