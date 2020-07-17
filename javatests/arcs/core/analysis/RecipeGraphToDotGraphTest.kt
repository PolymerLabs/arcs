package arcs.core.analysis

import arcs.core.data.Recipe
import arcs.core.data.proto.decodeRecipes
import arcs.core.testutil.protoloader.loadManifestBinaryProto
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class RecipeGraphToDotGraphTest {

    /** Decode the recipe in the given .arcs test. */
    private fun parseManifestWithSingleRecipe(test: String): Recipe {
        val manifestProto = loadManifestBinaryProto(
            "javatests/arcs/core/analysis/testdata/$test.pb.bin"
        )
        val recipes = manifestProto.decodeRecipes()
        return recipes.single()
    }

    @Test
    fun dotGraph_DefaultNodeLabels() {
        val recipe = parseManifestWithSingleRecipe("ok-directly-satisfied")
        val graph = RecipeGraph(recipe)
        val dotGraphLines = graph.toDotGraph().lines()

        // Ensure that the first and last line are as expected.
        assertThat(dotGraphLines.first()).isEqualTo("digraph G {")
        assertThat(dotGraphLines.last()).isEqualTo("}")

        // The order of lines can vary between runs. So, comparing lines to make test robust.
        assertThat(dotGraphLines).containsExactly(
            """digraph G {""",
            """  P1_0[shape="box", label="P1_0: [p:P1]"];""",
            """  P2_0[shape="box", label="P2_0: [p:P2]"];""",
            """  handle0[label="handle0: handle0: Foo {} [h:handle0]"];""",
            """  P1_0 -> handle0[label="Foo {}"];""",
            """  handle0 -> P2_0[label="Foo {}"];""",
            """}"""
        )
    }

    @Test
    fun dotGraph_CustomNodeLabels() {
        val recipe = parseManifestWithSingleRecipe("ok-directly-satisfied")
        val graph = RecipeGraph(recipe)
        val dotGraphLines = graph.toDotGraph { node -> "~~${node.debugName}~~" }.lines()

        // Ensure that the first and last line are as expected.
        assertThat(dotGraphLines.first()).isEqualTo("digraph G {")
        assertThat(dotGraphLines.last()).isEqualTo("}")

        // The order of lines can vary between runs. So, comparing lines to make test robust.
        assertThat(dotGraphLines).containsExactly(
            """digraph G {""",
            """  P1_0[shape="box", label="P1_0: ~~p:P1~~"];""",
            """  P2_0[shape="box", label="P2_0: ~~p:P2~~"];""",
            """  handle0[label="handle0: handle0: Foo {} ~~h:handle0~~"];""",
            """  P1_0 -> handle0[label="Foo {}"];""",
            """  handle0 -> P2_0[label="Foo {}"];""",
            """}"""
        )
    }
}
