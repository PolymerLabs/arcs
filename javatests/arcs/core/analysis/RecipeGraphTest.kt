package arcs.core.analysis

import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class RecipeGraphTest {
    // The test environment.
    var ramdiskStorageKey = "ramdisk://thing"
    val thingHandle = Recipe.Handle(
        "thing", Recipe.Handle.Fate.CREATE, TypeVariable("thing"), ramdiskStorageKey
    )
    val someHandle = Recipe.Handle(
        "some", Recipe.Handle.Fate.CREATE, TypeVariable("some"), ramdiskStorageKey
    )
    val readConnectionSpec = HandleConnectionSpec("r", HandleMode.Read, TypeVariable("r"))
    val readSomeConnectionSpec = HandleConnectionSpec("rs", HandleMode.Read, TypeVariable("rs"))
    val readerSpec = ParticleSpec(
        "Reader",
        listOf(readConnectionSpec, readSomeConnectionSpec).associateBy { it.name },
        "ReaderLocation"
    )
    val writeConnectionSpec = HandleConnectionSpec("w", HandleMode.Write, TypeVariable("w"))
    val rwConnectionSpec = HandleConnectionSpec("rw", HandleMode.ReadWrite, TypeVariable("rw"))
    val writerSpec = ParticleSpec(
        "Writer",
        listOf(writeConnectionSpec, readConnectionSpec, rwConnectionSpec).associateBy { it.name },
        "WriterLocation"
    )
    val readerParticle = Recipe.Particle(
        readerSpec,
        listOf(
            Recipe.Particle.HandleConnection(readConnectionSpec, thingHandle),
            Recipe.Particle.HandleConnection(readSomeConnectionSpec, someHandle)
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
     * Defines the following recipe:
     *    recipe PassThrough
     *      thing: create
     *      some: create
     *      Writer
     *        rw: reads writes thing
     *        w: writes thing
     *        r: reads thing
     *      Reader
     *        r: reads thing
     *        rs: reads some
     */
    val recipe = Recipe(
        "PassThrough",
        listOf(thingHandle, someHandle).associateBy { it.name },
        listOf(readerParticle, writerParticle),
        "arcId"
    )

    @Test
    fun testAddSuccessorUpdatesPredecessorOfSuccessor() {
        val particleNode = RecipeGraph.Node.Particle(readerParticle)
        val handleNode = RecipeGraph.Node.Handle(thingHandle)
        particleNode.addSuccessor(handleNode, readConnectionSpec)
        assertThat(handleNode.predecessors).contains(
            RecipeGraph.Node.Neighbor(particleNode, readConnectionSpec)
        )
    }

    @Test
    fun testGraphContainsAllConnections() {
        val graph = RecipeGraph(recipe)
        val readerNode = RecipeGraph.Node.Particle(readerParticle)
        val writerNode = RecipeGraph.Node.Particle(writerParticle)
        val thingNode = RecipeGraph.Node.Handle(thingHandle)
        val someNode = RecipeGraph.Node.Handle(someHandle)
        val readerPredecessors = listOf(
            RecipeGraph.Node.Neighbor(thingNode, readConnectionSpec),
            RecipeGraph.Node.Neighbor(someNode, readSomeConnectionSpec)
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
            RecipeGraph.Node.Neighbor(readerNode, readConnectionSpec)
        )
        val thingPredecessors = listOf(
            RecipeGraph.Node.Neighbor(writerNode, writeConnectionSpec),
            RecipeGraph.Node.Neighbor(writerNode, rwConnectionSpec)
        )
        val someSuccessors = listOf(
            RecipeGraph.Node.Neighbor(readerNode, readSomeConnectionSpec)
        )
        val somePredecessors = emptyList<RecipeGraph.Node.Neighbor>()
        val expectedSuccessors = mapOf(
            readerNode to readerSuccessors,
            writerNode to writerSuccessors,
            thingNode to thingSuccessors,
            someNode to someSuccessors
        )
        val expectedPredecessors = mapOf(
            readerNode to readerPredecessors,
            writerNode to writerPredecessors,
            thingNode to thingPredecessors,
            someNode to somePredecessors
        )
        assertThat(graph.nodes).containsExactly(readerNode, writerNode, thingNode, someNode)
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
