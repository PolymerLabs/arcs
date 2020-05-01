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

/** An abstract domain of set, where the elements are ordered by inclusion. */
class AbstractSet<S>(
    val value: BoundedAbstractElement<Set<S>>
) : AbstractValue<AbstractSet<S>> {
    override val isBottom = value.isBottom
    override val isTop = value.isTop

    val set: Set<S>?
        get() = value.value

    constructor(s: Set<S>): this(BoundedAbstractElement.makeValue(s))

    override infix fun isEquivalentTo(other: AbstractSet<S>) =
        value.isEquivalentTo(other.value) { a, b -> a == b }

    override infix fun join(other: AbstractSet<S>) = AbstractSet(
        value.join(other.value) { a, b -> a union b }
    )

    override infix fun meet(other: AbstractSet<S>) = AbstractSet(
        value.meet(other.value) { a, b -> a intersect b }
    )

    override fun toString() = when {
        value.isTop -> "TOP"
        value.isBottom -> "BOTTOM"
        else -> "${set}"
    }
}

/** Returns the name of the underlying handle or particle. */
fun RecipeGraph.Node.getName() = when (this) {
    is RecipeGraph.Node.Particle -> "p:${particle.spec.name}"
    is RecipeGraph.Node.Handle -> "h:${handle.name}"
}

/** A simple Fixpoint iterator for the purposes of testing. */
class TestAnalyzer(
    val startNames: Set<String>
) : RecipeGraphFixpointIterator<AbstractSet<String>>() {
    override fun getInitialValues(graph: RecipeGraph) = graph.nodes.filter {
        startNames.contains(it.getName())
    }.associateWith {
        AbstractSet<String>(setOf())
    }

    override fun nodeTransfer(handle: Recipe.Handle, input: AbstractSet<String>) =
        input.set?.let { AbstractSet<String>(it + "h:${handle.name}") } ?: input

    override fun nodeTransfer(particle: Recipe.Particle, input: AbstractSet<String>) =
        input.set?.let { AbstractSet<String>(it + "p:${particle.spec.name}") } ?: input

    override fun edgeTransfer(
        handle: Recipe.Handle,
        particle: Recipe.Particle,
        spec: HandleConnectionSpec,
        input: AbstractSet<String>
    ) = input.set?.let {
        AbstractSet<String>(it + "h:${handle.name} -> p:${particle.spec.name}")
    } ?: input

    override fun edgeTransfer(
        particle: Recipe.Particle,
        handle: Recipe.Handle,
        spec: HandleConnectionSpec,
        input: AbstractSet<String>
    ) = input.set?.let {
        AbstractSet<String>(it + "p:${particle.spec.name} -> h:${handle.name}")
    } ?: input
}

@RunWith(JUnit4::class)
class RecipeGraphFixpointIteratorTest {
    private val thing = Recipe.Handle("thing", Recipe.Handle.Fate.CREATE, TypeVariable("thing"))
    private val name = Recipe.Handle("name", Recipe.Handle.Fate.CREATE, TypeVariable("name"))
    private val readConnection = HandleConnectionSpec("r", HandleMode.Read, TypeVariable("r"))
    private val writeConnection = HandleConnectionSpec("w", HandleMode.Write, TypeVariable("w"))
    private val readerSpec = ParticleSpec(
        "Reader",
        listOf(readConnection).associateBy { it.name },
        "ReaderLocation"
    )
    private val writerSpec = ParticleSpec(
        "Writer",
        listOf(writeConnection).associateBy { it.name },
        "WriterLocation"
    )
    private val anotherWriterSpec = ParticleSpec(
        "AnotherWriter",
        listOf(writeConnection).associateBy { it.name },
        "WriterLocation"
    )
    private val readerParticle = Recipe.Particle(
        readerSpec,
        listOf(Recipe.Particle.HandleConnection(readConnection, thing))
    )
    private val writerParticle = Recipe.Particle(
        writerSpec,
        listOf(Recipe.Particle.HandleConnection(writeConnection, thing))
    )
    private val anotherWriterParticle = Recipe.Particle(
        anotherWriterSpec,
        listOf(Recipe.Particle.HandleConnection(writeConnection, thing))
    )

    @Test
    fun straightLineFlow() {
        // [Writer] -> (thing) -> [Reader]
        val recipe = Recipe(
            "StraightLine",
            listOf(thing).associateBy { it.name },
            listOf(readerParticle, writerParticle),
            "arcId"
        )
        val graph = RecipeGraph(recipe)
        val analyzer = TestAnalyzer(setOf("p:${writerParticle.spec.name}"))

        analyzer.computeFixpoint(graph)

        assertThat(analyzer.getValue(writerParticle)?.set).isEmpty()
        assertThat(analyzer.getValue(thing)?.set)
            .containsExactly("p:Writer", "p:Writer -> h:thing")
        assertThat(analyzer.getValue(readerParticle)?.set)
            .containsExactly("p:Writer", "p:Writer -> h:thing", "h:thing", "h:thing -> p:Reader")
    }

    @Test
    fun joinsFlow() {
        // [Writer] ---------> (thing) -> [Reader]
        // [AnotherWriter] ------^
        val recipe = Recipe(
            "Join",
            listOf(thing).associateBy { it.name },
            listOf(readerParticle, writerParticle, anotherWriterParticle),
            "arcId"
        )
        val graph = RecipeGraph(recipe)
        val analyzer = TestAnalyzer(
            setOf("p:${writerParticle.spec.name}", "p:${anotherWriterParticle.spec.name}")
        )

        analyzer.computeFixpoint(graph)

        assertThat(analyzer.getValue(writerParticle)?.set).isEmpty()
        assertThat(analyzer.getValue(anotherWriterParticle)?.set).isEmpty()
        assertThat(analyzer.getValue(thing)?.set)
            .containsExactly(
                "p:Writer",
                "p:AnotherWriter",
                "p:Writer -> h:thing",
                "p:AnotherWriter -> h:thing"
            )
        assertThat(analyzer.getValue(readerParticle)?.set)
            .containsExactly(
                "p:Writer",
                "p:AnotherWriter",
                "p:Writer -> h:thing",
                "p:AnotherWriter -> h:thing",
                "h:thing",
                "h:thing -> p:Reader"
            )
    }

    @Test
    fun unreachable() {
        // [Writer] ----------> (thing) -> [Reader]
        // [AnotherWriter] -------^
        val recipe = Recipe(
            "Join",
            listOf(thing).associateBy { it.name },
            listOf(readerParticle, writerParticle, anotherWriterParticle),
            "arcId"
        )
        val graph = RecipeGraph(recipe)
        val analyzer = TestAnalyzer(setOf("p:${writerParticle.spec.name}"))

        analyzer.computeFixpoint(graph)

        assertThat(analyzer.getValue(writerParticle)?.set).isEmpty()
        // AnotherWriter is unreachable as we don't mark it as a start node.
        // Therefore, this should be bottom.
        assertThat(analyzer.getValue(anotherWriterParticle)?.set).isNull()
        // AnotherWriter should not be in the following sets.
        assertThat(analyzer.getValue(thing)?.set)
            .containsExactly(
                "p:Writer",
                "p:Writer -> h:thing"
            )
        assertThat(analyzer.getValue(readerParticle)?.set)
            .containsExactly(
                "p:Writer",
                "p:Writer -> h:thing",
                "h:thing",
                "h:thing -> p:Reader"
            )
    }

    @Test
    fun loops() {
        //                  /---> [Reader]
        // [Writer] -> (thing) -> [Recognizer] -> (name) -> [Tagger] -+
        //                ^-------------------------------------------+
        val recognizerSpec = ParticleSpec(
            "Recognizer",
            listOf(writeConnection, readConnection).associateBy { it.name },
            "RecognizerLocation"
        )
        val recognizerParticle = Recipe.Particle(
            recognizerSpec,
            listOf(
                Recipe.Particle.HandleConnection(writeConnection, name),
                Recipe.Particle.HandleConnection(readConnection, thing)
            )
        )
        val taggerSpec = ParticleSpec(
            "Tagger",
            listOf(writeConnection, readConnection).associateBy { it.name },
            "TaggerLocation"
        )
        val taggerParticle = Recipe.Particle(
            taggerSpec,
            listOf(
                Recipe.Particle.HandleConnection(writeConnection, thing),
                Recipe.Particle.HandleConnection(readConnection, name)
            )
        )
        val recipe = Recipe(
            "Loop",
            listOf(thing, name).associateBy { it.name },
            listOf(readerParticle, writerParticle, recognizerParticle, taggerParticle),
            "arcId"
        )

        val graph = RecipeGraph(recipe)
        val analyzer = TestAnalyzer(setOf("p:${writerParticle.spec.name}"))

        analyzer.computeFixpoint(graph)

        assertThat(analyzer.getValue(writerParticle)?.set).isEmpty()
        // The values for the nodes in the loop are all the same.
        val expectedLoopValue = setOf(
            "p:Writer",
            "p:Recognizer",
            "p:Tagger",
            "h:thing",
            "h:name",
            "p:Writer -> h:thing",
            "h:thing -> p:Recognizer",
            "p:Recognizer -> h:name",
            "h:name -> p:Tagger",
            "p:Tagger -> h:thing"
        )
        assertThat(analyzer.getValue(thing)?.set).isEqualTo(expectedLoopValue)
        assertThat(analyzer.getValue(recognizerParticle)?.set).isEqualTo(expectedLoopValue)
        assertThat(analyzer.getValue(name)?.set).isEqualTo(expectedLoopValue)
        assertThat(analyzer.getValue(taggerParticle)?.set).isEqualTo(expectedLoopValue)
        assertThat(analyzer.getValue(readerParticle)?.set)
            .isEqualTo(expectedLoopValue + "h:thing -> p:Reader")
    }
}
