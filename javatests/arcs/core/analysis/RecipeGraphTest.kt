package arcs.core.analysis

import arcs.core.data.AccessPath
import arcs.core.data.Annotation
import arcs.core.data.Check
import arcs.core.data.Claim
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.InformationFlowLabel
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class RecipeGraphTest {
    // The test environment.
    class TestRecipe(val queryMode: Boolean = false) {
        val thingHandle = Recipe.Handle(
            "thing",
            Recipe.Handle.Fate.CREATE,
            TypeVariable("thing")
        )
        val someHandle = Recipe.Handle("some", Recipe.Handle.Fate.CREATE, TypeVariable("some"))
        val joinedHandle = Recipe.Handle(
            name = "joined",
            fate = Recipe.Handle.Fate.JOIN,
            type = TypeVariable("joined"),
            associatedHandles=listOf(thingHandle, someHandle)
        )
        val readConnectionSpec = HandleConnectionSpec(
            "r",
            if (queryMode) HandleMode.ReadQuery else HandleMode.Read,
            TypeVariable("r")
        )
        val readSomeConnectionSpec = HandleConnectionSpec(
            "rs",
            if (queryMode) HandleMode.Query else HandleMode.Read,
            TypeVariable("rs")
        )
        val readJoinConnectionSpec = HandleConnectionSpec(
            "rj",
            if (queryMode) HandleMode.Query else HandleMode.Read,
            TypeVariable("rj")
        )
        val readerSpec = ParticleSpec(
            "Reader",
            listOf(readConnectionSpec, readSomeConnectionSpec).associateBy { it.name },
            "ReaderLocation"
        )
        val writeConnectionSpec = HandleConnectionSpec(
            "w",
            if (queryMode) HandleMode.WriteQuery else HandleMode.Write,
            TypeVariable("w")
        )
        val rwConnectionSpec = HandleConnectionSpec(
            "rw",
            if (queryMode) HandleMode.ReadWriteQuery else HandleMode.ReadWrite,
            TypeVariable("rw")
        )
        val writerSpec = ParticleSpec(
            "Writer",
            listOf(writeConnectionSpec, readConnectionSpec, rwConnectionSpec)
                .associateBy { it.name },
            "WriterLocation"
        )
        val readerParticle = Recipe.Particle(
            readerSpec,
            listOf(
                Recipe.Particle.HandleConnection(readConnectionSpec, thingHandle),
                Recipe.Particle.HandleConnection(readSomeConnectionSpec, someHandle),
                Recipe.Particle.HandleConnection(readJoinConnectionSpec, joinedHandle)
            )
        )
        val writerParticle = Recipe.Particle(
            writerSpec,
            listOf(
                Recipe.Particle.HandleConnection(writeConnectionSpec, thingHandle),
                Recipe.Particle.HandleConnection(readConnectionSpec, thingHandle),
                Recipe.Particle.HandleConnection(rwConnectionSpec, thingHandle)
            )
        )
        /**
         * Defines the following recipe (similarly for query modes):
         *    recipe PassThrough
         *      thing: create
         *      some: create
         *      joined: join(thing, some)
         *      Writer
         *        rw: reads writes thing
         *        w: writes thing
         *        r: reads thing
         *      Reader
         *        r: reads thing
         *        rs: reads some
         *        rj: reads joined
         */
        val recipe = Recipe(
            "PassThrough",
            listOf(thingHandle, someHandle, joinedHandle).associateBy { it.name },
            listOf(readerParticle, writerParticle),
            listOf(Annotation.createArcId("arcId"))
        )
    }

    @Test
    fun addSuccessorUpdatesPredecessorOfSuccessor() {
        with (TestRecipe()) {
            val particleNode = RecipeGraph.Node.Particle(readerParticle)
            val handleNode = RecipeGraph.Node.Handle(thingHandle)
            particleNode.addSuccessor(handleNode, readConnectionSpec)
            assertThat(handleNode.predecessors).contains(
                RecipeGraph.Node.Neighbor(particleNode, readConnectionSpec)
            )
        }
    }

    @Test
    fun prettyPrintNodes() {
        with (TestRecipe()) {
            val particleNode = RecipeGraph.Node.Particle(readerParticle)
            val handleNode = RecipeGraph.Node.Handle(thingHandle)

            assertThat("$particleNode").isEqualTo("[p:Reader]")
            assertThat("$handleNode").isEqualTo("[h:thing]")
        }
    }

    private fun testAllConnections(testRecipe: TestRecipe) {
        with (testRecipe) {
            val graph = RecipeGraph(recipe)
            val readerNode = RecipeGraph.Node.Particle(readerParticle)
            val writerNode = RecipeGraph.Node.Particle(writerParticle)
            val thingNode = RecipeGraph.Node.Handle(thingHandle)
            val someNode = RecipeGraph.Node.Handle(someHandle)
            val joinedNode = RecipeGraph.Node.Handle(joinedHandle)
            val readerPredecessors = listOf(
                RecipeGraph.Node.Neighbor(thingNode, readConnectionSpec),
                RecipeGraph.Node.Neighbor(someNode, readSomeConnectionSpec),
                RecipeGraph.Node.Neighbor(joinedNode, readJoinConnectionSpec)
            )
            val readerSuccessors = emptyList<RecipeGraph.Node.Neighbor>()
            val writerSuccessors = listOf(
                RecipeGraph.Node.Neighbor(thingNode, writeConnectionSpec),
                RecipeGraph.Node.Neighbor(thingNode, rwConnectionSpec)
            )
            val writerPredecessors = listOf(
                RecipeGraph.Node.Neighbor(thingNode, rwConnectionSpec),
                RecipeGraph.Node.Neighbor(thingNode, readConnectionSpec)
            )
            val thingSuccessors = listOf(
                RecipeGraph.Node.Neighbor(writerNode, readConnectionSpec),
                RecipeGraph.Node.Neighbor(writerNode, rwConnectionSpec),
                RecipeGraph.Node.Neighbor(readerNode, readConnectionSpec),
                RecipeGraph.Node.Neighbor(joinedNode, RecipeGraph.JoinSpec(0))
            )
            val thingPredecessors = listOf(
                RecipeGraph.Node.Neighbor(writerNode, writeConnectionSpec),
                RecipeGraph.Node.Neighbor(writerNode, rwConnectionSpec)
            )
            val someSuccessors = listOf(
                RecipeGraph.Node.Neighbor(readerNode, readSomeConnectionSpec),
                RecipeGraph.Node.Neighbor(joinedNode, RecipeGraph.JoinSpec(1))
            )
            val somePredecessors = emptyList<RecipeGraph.Node.Neighbor>()
            val joinedSuccessors = listOf(
                RecipeGraph.Node.Neighbor(readerNode, readJoinConnectionSpec)
            )
            val joinedPredecessors = listOf(
                RecipeGraph.Node.Neighbor(thingNode, RecipeGraph.JoinSpec(0)),
                RecipeGraph.Node.Neighbor(someNode, RecipeGraph.JoinSpec(1))
            )
            val expectedSuccessors = mapOf(
                readerNode to readerSuccessors,
                writerNode to writerSuccessors,
                thingNode to thingSuccessors,
                someNode to someSuccessors,
                joinedNode to joinedSuccessors
            )
            val expectedPredecessors = mapOf(
                readerNode to readerPredecessors,
                writerNode to writerPredecessors,
                thingNode to thingPredecessors,
                someNode to somePredecessors,
                joinedNode to joinedPredecessors
            )
            assertThat(graph.nodes)
                .containsExactly(readerNode, writerNode, thingNode, joinedNode, someNode)
            graph.nodes.forEach {
                assertWithMessage("Checking successors of ${it}:")
                    .that(it.successors)
                    .containsExactlyElementsIn(requireNotNull(expectedSuccessors[it]))
                assertWithMessage("Checking predecessors of ${it}:")
                    .that(it.predecessors)
                    .containsExactlyElementsIn(requireNotNull(expectedPredecessors[it]))
            }
        }
    }

    @Test
    fun graphContainsAllConnections() {
        setOf(TestRecipe(queryMode = false), TestRecipe(queryMode = true)).forEach {
            testAllConnections(it)
        }
    }

    @Test
    fun particleNodes() {
        with (TestRecipe()) {
            val graph = RecipeGraph(recipe)
            assertThat(graph.particleNodes.map { it.particle }).containsExactly(
                readerParticle,
                writerParticle
            )
        }
    }

    @Test
    fun handleNodes() {
        with (TestRecipe()) {
            val graph = RecipeGraph(recipe)
            assertThat(graph.handleNodes.map { it.handle }).containsExactly(
                thingHandle,
                someHandle,
                joinedHandle
            )
        }
    }
}
