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
  @Test
  fun dotGraph_defaultNodeLabels() {
    val recipe = parseManifestWithSingleRecipe("ok_directly_satisfied")
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
      """  handle0[label="handle0: Foo {} [h:handle0]"];""",
      """  P1_0 -> handle0[label="foo: Foo {}"];""",
      """  handle0 -> P2_0[label="bar: Foo {}"];""",
      """}"""
    )
  }

  @Test
  fun dotGraph_customNodeLabels() {
    val recipe = parseManifestWithSingleRecipe("ok_directly_satisfied")
    val graph = RecipeGraph(recipe)
    val dotGraphLines =
      graph.toDotGraph(nodeLabeler = { _, node -> Label.Text("~~${node.debugName}~~") })
        .lines()

    // Ensure that the first and last line are as expected.
    assertThat(dotGraphLines.first()).isEqualTo("digraph G {")
    assertThat(dotGraphLines.last()).isEqualTo("}")

    // The order of lines can vary between runs. So, comparing lines to make test robust.
    assertThat(dotGraphLines).containsExactly(
      """digraph G {""",
      """  P1_0[shape="box", label="~~p:P1~~"];""",
      """  P2_0[shape="box", label="~~p:P2~~"];""",
      """  handle0[label="~~h:handle0~~"];""",
      """  P1_0 -> handle0[label="foo: Foo {}"];""",
      """  handle0 -> P2_0[label="bar: Foo {}"];""",
      """}"""
    )
  }

  @Test
  fun prettyNodeLabeler_particle() {
    val recipe = parseManifestWithSingleRecipe("ok_directly_satisfied")
    val particleText = recipe.particles.map {
      PRETTY_NODE_LABELER(it.spec.name, RecipeGraph.Node.Particle(it)).toString()
    }
    /* ktlint-disable max-line-length */
    assertThat(particleText).containsExactly(
      """<<b>P1</b>: [p:P1]<BR ALIGN="LEFT"/>&nbsp;&nbsp;claims: [<BR ALIGN="LEFT"/>&nbsp;&nbsp;&nbsp;&nbsp;hcs:P1.foo is trusted<BR ALIGN="LEFT"/>&nbsp;&nbsp;]<BR ALIGN="LEFT"/>>""",
      """<<b>P2</b>: [p:P2]<BR ALIGN="LEFT"/>&nbsp;&nbsp;checks: [<BR ALIGN="LEFT"/>&nbsp;&nbsp;&nbsp;&nbsp;hcs:P2.bar is trusted<BR ALIGN="LEFT"/>&nbsp;&nbsp;]<BR ALIGN="LEFT"/>>"""
    )
    /* ktlint-enable max-line-length */
  }

  @Test
  fun prettyNodeLabeler_handle() {
    val recipe = parseManifestWithSingleRecipe("ok_directly_satisfied")
    val particleText = recipe.handles.map { (name, handle) ->
      PRETTY_NODE_LABELER(name, RecipeGraph.Node.Handle(handle)).toString()
    }
    assertThat(particleText).containsExactly(
      """"&nbsp;&nbsp;handle0: Foo {} [h:handle0]&nbsp;&nbsp;""""
    )
  }

  @Test
  fun textLabel_escapesQuotes() {
    val label = Label.Text(""""""")
    assertThat(label.toString()).isEqualTo("\"&quot;\"")
  }

  @Test
  fun htmlLabel_indent() {
    val label = Label.Html(" ") {
      +"0"
      indent {
        +"1"
        indent {
          +"2"
        }
      }
      +"Out!"
    }
    assertThat(label.toString()).isEqualTo(
      """<0<BR ALIGN="LEFT"/> 1<BR ALIGN="LEFT"/>  2<BR ALIGN="LEFT"/>Out!<BR ALIGN="LEFT"/>>"""
    )
  }

  @Test
  fun htmlLabel_align() {
    val label = Label.Html {
      left { +"Left" }
      center { +"Center" }
      right { +"Right" }
    }
    assertThat(label.toString()).isEqualTo(
      """<Left<BR ALIGN="LEFT"/>Center<BR ALIGN="CENTER"/>Right<BR ALIGN="RIGHT"/>>"""
    )
  }

  /** Decode the recipe in the given .arcs test. */
  private fun parseManifestWithSingleRecipe(test: String): Recipe {
    val manifestProto = loadManifestBinaryProto(
      "javatests/arcs/core/analysis/testdata/$test.binarypb"
    )
    val recipes = manifestProto.decodeRecipes()
    return recipes.single()
  }
}
