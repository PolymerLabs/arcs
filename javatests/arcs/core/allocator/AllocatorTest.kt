package arcs.core.allocator

import arcs.core.common.Id
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.ParticleSpec
import arcs.core.data.Plan
import arcs.core.data.PlanPartition
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.host.AbstractArcHost
import arcs.core.host.ParticleNotFoundException
import arcs.core.host.toIdentifierList
import arcs.core.storage.driver.VolatileStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.jvm.host.ExplicitHostRegistry
import arcs.sdk.Particle
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.reflect.KClass

@RunWith(JUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
class AllocatorTest {
    /**
     * A test recipe, two particles
     * [WritePerson] writes a Person to a handle
     * [ReadPerson] reads a Person from a handle
     * [WritePerson] runs in [WritingHost]
     * [ReadPerson] runs in [ReadingHost]
     *
     * Hand translated 'compilation' roughly equivalent to:
     *
     * schema Person { name: Text }
     * particle ReadPerson in 'arcs.core.host.AllocatorTest.ReadPerson'
     *   person: reads Person
     *
     * particle WritePerson in 'arcs.core.host.AllocatorTest.WritePerson'
     *   person: writes Person
     *
     * recipe WriteAndReadPerson
     *   recipePerson: create
     *   WritePerson
     *     person: writes recipePerson
     *   ReadPerson
     *     person: reads recipePerson
     */
    private val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
        SchemaDescription(),
        "hash"
    )

    private val personEntityType = EntityType(personSchema)


    class WritePerson : Particle
    class ReadPerson : Particle

    open class TestingHost(vararg particles: KClass<out Particle>) :
        AbstractArcHost(particles.toIdentifierList()) {

        var started = mutableListOf<PlanPartition>()

        override suspend fun startArc(partition: PlanPartition) {
            super.startArc(partition)
            started.add(partition)
        }

        fun setup() {
            started.clear()
        }
    }

    class WritingHost : TestingHost(WritePerson::class)
    class ReadingHost : TestingHost(ReadPerson::class)

    private lateinit var readPersonHandleConnectionSpec: HandleConnectionSpec
    private lateinit var writePersonHandleConnectionSpec: HandleConnectionSpec
    private lateinit var writePersonParticleSpec: ParticleSpec
    private lateinit var readPersonParticleSpec: ParticleSpec
    private lateinit var writeAndReadPersonPlan: Plan
    private lateinit var hostRegistry: ExplicitHostRegistry

    @Before
    fun setUp() {
        runBlocking {
            hostRegistry = ExplicitHostRegistry()
            hostRegistry.registerHost(ReadingHost())
            hostRegistry.registerHost(WritingHost())
            writePersonHandleConnectionSpec =
                HandleConnectionSpec(null, personEntityType)

            writePersonParticleSpec = ParticleSpec(
                "WritePerson",
                WritePerson::class.java.getCanonicalName()!!,
                mapOf("recipePerson" to writePersonHandleConnectionSpec)
            )

            readPersonHandleConnectionSpec = HandleConnectionSpec(null, personEntityType)

            readPersonParticleSpec = ParticleSpec(
                "ReadPerson",
                ReadPerson::class.java.getCanonicalName()!!,
                mapOf("recipePerson" to readPersonHandleConnectionSpec)
            )

            writeAndReadPersonPlan = Plan(
                listOf(writePersonParticleSpec, readPersonParticleSpec)
            )

            hostRegistry.availableArcHosts().forEach {
                if (it is TestingHost) {
                    it.setup()
                }
            }
        }
    }

    /**
     * Tests that the Recipe is properly partitioned so that [ReadingHost] contains only
     * [ReadPerson] with associated handles and connections, and [WritingHost] contains only
     * [WritePerson] with associated handles and connections.
     */
    @Test
    fun allocator_computePartitions() = runBlockingTest {
        val allocator = Allocator(hostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        assertThat(planPartitions).containsExactly(
            PlanPartition(
                arcId.toString(),
                ReadingHost::class.java.canonicalName!!,
                listOf(readPersonParticleSpec)
            ),
            PlanPartition(
                arcId.toString(),
                WritingHost::class.java.canonicalName!!,
                listOf(writePersonParticleSpec)
            )
        )
    }

    @Test
    fun allocator_verifyStorageKeysCreated() = runBlockingTest {
        writeAndReadPersonPlan.particles.forEach {
            it.handles.forEach { (_, spec) ->
                assertThat(spec.storageKey).isNull()
            }
        }
        val allocator = Allocator(hostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it.particles }.forEach {
            particle -> particle.handles.forEach { (_, spec) ->
                assertThat(spec.storageKey).isNotNull()
            }
        }
    }

    @Test
    fun allocator_verifyStorageKeysNotOverwritten() = runBlockingTest {
        val idGenerator = Id.Generator.newSession()
        val testArcId = idGenerator.newArcId("Test")
        val testKey = VolatileStorageKey(testArcId, "test")

        writeAndReadPersonPlan.particles.forEach { it ->
            it.handles.getValue("recipePerson").storageKey = testKey
        }

        val allocator = Allocator(hostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it.particles }.forEach {
            particle -> particle.handles.forEach { (_, spec) ->
               assertThat(spec.storageKey).isEqualTo(testKey)
            }
        }
    }

    @Test
    fun allocator_verifyArcHostStartCalled() = runBlockingTest {
        val allocator = Allocator(hostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.forEach {
            val host = allocator.lookupArcHost(it.arcHost)
            when (host) {
                is TestingHost ->
                    assertThat(
                        (allocator.lookupArcHost(it.arcHost) as TestingHost).started
                    ).containsExactly(it)
                else -> {
                    assert(false)
                }
            }
        }
    }

    @Test
    fun allocator_verifyUnknownParticleThrows() = runBlockingTest {
        val allocator = Allocator(hostRegistry)
        val particleSpec = ParticleSpec("UnknownParticle", "Unknown", mapOf())

        val plan = Plan(listOf(particleSpec))
        assertSuspendingThrows(ParticleNotFoundException::class) {
            allocator.startArcForPlan("unknown", plan)
        }
    }
}
