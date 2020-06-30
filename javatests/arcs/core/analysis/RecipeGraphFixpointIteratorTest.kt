package arcs.core.analysis

import arcs.core.data.Annotation
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.HandleMode
import arcs.core.data.ParticleSpec
import arcs.core.data.Recipe
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.TypeVariable
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Returns the name of the underlying handle or particle. */
fun RecipeGraph.Node.getName() = when (this) {
    is RecipeGraph.Node.Particle -> "p:${particle.spec.name}"
    is RecipeGraph.Node.Handle -> "h:${handle.name}"
}

/** A simple Fixpoint iterator for the purposes of testing. */
class TestAnalyzer(
    val startNames: Set<String>
) : RecipeGraphFixpointIterator<AbstractSet<String>>(AbstractSet.getBottom<String>()) {
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
        fromHandle: Recipe.Handle,
        toParticle: Recipe.Particle,
        spec: HandleConnectionSpec,
        input: AbstractSet<String>
    ) = input.set?.let {
        AbstractSet<String>(it + "h:${fromHandle.name} -> p:${toParticle.spec.name}")
    } ?: input

    override fun edgeTransfer(
        fromParticle: Recipe.Particle,
        toHandle: Recipe.Handle,
        spec: HandleConnectionSpec,
        input: AbstractSet<String>
    ) = input.set?.let {
        AbstractSet<String>(it + "p:${fromParticle.spec.name} -> h:${toHandle.name}")
    } ?: input

    override fun edgeTransfer(
        fromHandle: Recipe.Handle,
        toHandle: Recipe.Handle,
        spec: RecipeGraph.JoinSpec,
        input: AbstractSet<String>
    ) = input.set?.let {
        AbstractSet<String>(it + "h:${fromHandle.name} -> h:${toHandle.name}")
    } ?: input

}

@RunWith(JUnit4::class)
class RecipeGraphFixpointIteratorTest {
    private val thing = Recipe.Handle("thing", Recipe.Handle.Fate.CREATE, TypeVariable("thing"))
    private val thingType = EntityType(Schema(
        names = setOf(SchemaName("Thing")),
        fields = SchemaFields(singletons = mapOf("name" to FieldType.Text), collections = emptyMap()),
        hash = ""
    ))
    private val name = Recipe.Handle("name", Recipe.Handle.Fate.CREATE, TypeVariable("name"))
    private val nameType = EntityType(Schema(
        names = setOf(SchemaName("Name")),
        fields = SchemaFields(singletons = mapOf("fullname" to FieldType.Text), collections = emptyMap()),
        hash = ""
    ))
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
        listOf(Recipe.Particle.HandleConnection(readConnection, thing, thingType))
    )
    private val writerParticle = Recipe.Particle(
        writerSpec,
        listOf(Recipe.Particle.HandleConnection(writeConnection, thing, nameType))
    )
    private val anotherWriterParticle = Recipe.Particle(
        anotherWriterSpec,
        listOf(Recipe.Particle.HandleConnection(writeConnection, thing, thingType))
    )

    private fun createGraph(
        name: String,
        handles: List<Recipe.Handle>,
        particles: List<Recipe.Particle>
    ): RecipeGraph {
        return RecipeGraph(
            Recipe(
                name,
                handles.associateBy { it.name },
                particles,
                listOf(Annotation.createArcId("arcId"))
            )
        )
    }

    @Test
    fun straightLineFlow() {
        // [Writer] -> (thing) -> [Reader]
        val graph = createGraph(
            name = "StraightLine",
            handles = listOf(thing),
            particles = listOf(readerParticle, writerParticle)
        )
        val analyzer = TestAnalyzer(setOf("p:${writerParticle.spec.name}"))

        val result = analyzer.computeFixpoint(graph)

        with(result) {
            assertThat(getValue(writerParticle).set).isEmpty()
            assertThat(getValue(thing).set)
                .containsExactly("p:Writer", "p:Writer -> h:thing")
            assertThat(getValue(readerParticle).set)
                .containsExactly(
                    "p:Writer",
                    "p:Writer -> h:thing",
                    "h:thing",
                    "h:thing -> p:Reader"
                )
        }
    }

    @Test
    fun joinsFlow() {
        // [Writer] ---------> (thing) -> [Reader]
        // [AnotherWriter] ------^
        val graph = createGraph(
            name = "Join",
            handles = listOf(thing),
            particles = listOf(readerParticle, writerParticle, anotherWriterParticle)
        )
        val analyzer = TestAnalyzer(
            setOf("p:${writerParticle.spec.name}", "p:${anotherWriterParticle.spec.name}")
        )

        val result = analyzer.computeFixpoint(graph)

        with(result) {
            assertThat(getValue(writerParticle).set).isEmpty()
            assertThat(getValue(anotherWriterParticle).set).isEmpty()
            assertThat(getValue(thing).set)
                .containsExactly(
                    "p:Writer",
                    "p:AnotherWriter",
                    "p:Writer -> h:thing",
                    "p:AnotherWriter -> h:thing"
                )
            assertThat(getValue(readerParticle).set)
                .containsExactly(
                    "p:Writer",
                    "p:AnotherWriter",
                    "p:Writer -> h:thing",
                    "p:AnotherWriter -> h:thing",
                    "h:thing",
                    "h:thing -> p:Reader"
                )
        }
    }

    @Test
    fun unreachable() {
        // [Writer] ----------> (thing) -> [Reader]
        // [AnotherWriter] -------^
        val graph = createGraph(
            name = "Join",
            handles = listOf(thing),
            particles = listOf(readerParticle, writerParticle, anotherWriterParticle)
        )
        val analyzer = TestAnalyzer(setOf("p:${writerParticle.spec.name}"))

        val result = analyzer.computeFixpoint(graph)

        with(result) {
            assertThat(getValue(writerParticle).set).isEmpty()
            // AnotherWriter is unreachable as we don't mark it as a start node.
            // Therefore, this should be bottom.
            assertThat(getValue(anotherWriterParticle).isBottom).isTrue()
            // AnotherWriter should not be in the following sets.
            assertThat(getValue(thing).set)
                .containsExactly(
                    "p:Writer",
                    "p:Writer -> h:thing"
                )
            assertThat(getValue(readerParticle).set)
                .containsExactly(
                    "p:Writer",
                    "p:Writer -> h:thing",
                    "h:thing",
                    "h:thing -> p:Reader"
                )
        }
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
                Recipe.Particle.HandleConnection(writeConnection, name, nameType),
                Recipe.Particle.HandleConnection(readConnection, thing, thingType)
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
                Recipe.Particle.HandleConnection(writeConnection, thing, thingType),
                Recipe.Particle.HandleConnection(readConnection, name, nameType)
            )
        )
        val graph = createGraph(
            name = "Loop",
            handles = listOf(thing, name),
            particles = listOf(readerParticle, writerParticle, recognizerParticle, taggerParticle)
        )
        val analyzer = TestAnalyzer(setOf("p:${writerParticle.spec.name}"))

        val result = analyzer.computeFixpoint(graph)

        with(result) {
            assertThat(getValue(writerParticle).set).isEmpty()
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
            assertThat(getValue(thing).set).isEqualTo(expectedLoopValue)
            assertThat(getValue(recognizerParticle).set).isEqualTo(expectedLoopValue)
            assertThat(getValue(name).set).isEqualTo(expectedLoopValue)
            assertThat(getValue(taggerParticle).set).isEqualTo(expectedLoopValue)
            assertThat(getValue(readerParticle).set)
                .isEqualTo(expectedLoopValue + "h:thing -> p:Reader")
        }
    }

    @Test
    fun joinHandles() {
        // recipe X
        //   thing: create
        //   name: create
        //   joined: join(thing, name)
        //   Reader
        //     r: reads joined
        val joined = Recipe.Handle(
            name = "joined",
            fate = Recipe.Handle.Fate.JOIN,
            type = TypeVariable("joined"),
            associatedHandles=listOf(name, thing)
        )
        val joinReaderParticle = Recipe.Particle(
            readerSpec,
            listOf(Recipe.Particle.HandleConnection(readConnection, joined, thingType))
        )
        val graph = createGraph(
            name = "JoinHandles",
            handles = listOf(thing, name, joined),
            particles = listOf(joinReaderParticle)
        )
        val analyzer = TestAnalyzer(setOf("h:thing", "h:name"))
        val result = analyzer.computeFixpoint(graph)
        print(result.toString())
        with(result) {
            assertThat(getValue(joinReaderParticle).set).containsExactly(
                "h:thing",
                "h:name",
                "h:joined",
                "h:name -> h:joined",
                "h:thing -> h:joined",
                "h:joined -> p:Reader"
            )
        }
    }
}
