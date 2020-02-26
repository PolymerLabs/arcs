package arcs.core.allocator

import arcs.sdk.Particle
import arcs.core.common.Id
import arcs.core.data.CreateableStorageKey
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.host.AbstractArcHost
import arcs.core.host.ParticleNotFoundException
import arcs.core.host.toIdentifierList
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.VolatileStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.jvm.host.ExplicitHostRegistry
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
        "hash"
    )

    private val personEntityType = EntityType(personSchema)


    class WritePerson : Particle
    class ReadPerson : Particle

    open class TestingHost(vararg particles: KClass<out Particle>) :
        AbstractArcHost(particles.toIdentifierList()) {

        var started = mutableListOf<Plan.Partition>()

        override suspend fun startArc(partition: Plan.Partition) {
            super.startArc(partition)
            started.add(partition)
        }

        fun setup() {
            started.clear()
        }
    }

    class WritingHost : TestingHost(WritePerson::class)
    class ReadingHost : TestingHost(ReadPerson::class)

    private lateinit var readPersonHandleConnection: Plan.HandleConnection
    private lateinit var writePersonHandleConnection: Plan.HandleConnection
    private lateinit var writePersonParticle: Plan.Particle
    private lateinit var readPersonParticle: Plan.Particle
    private lateinit var writeAndReadPersonPlan: Plan
    private lateinit var hostRegistry: ExplicitHostRegistry

    @Before
    fun setUp() {
        runBlocking {
            hostRegistry = ExplicitHostRegistry()
            hostRegistry.registerHost(ReadingHost())
            hostRegistry.registerHost(WritingHost())
            RamDisk.clear()

            writePersonHandleConnection =
                Plan.HandleConnection(
                    CreateableStorageKey("recipePerson"),
                    personEntityType
                )

            writePersonParticle = Plan.Particle(
                "WritePerson",
                WritePerson::class.java.getCanonicalName()!!,
                mapOf("recipePerson" to writePersonHandleConnection)
            )

            readPersonHandleConnection = Plan.HandleConnection(
                CreateableStorageKey("recipePerson"),
                personEntityType
            )

            readPersonParticle = Plan.Particle(
                "ReadPerson",
                ReadPerson::class.java.getCanonicalName()!!,
                mapOf("recipePerson" to readPersonHandleConnection)
            )

            writeAndReadPersonPlan = Plan(
                listOf(writePersonParticle, readPersonParticle)
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
            Plan.Partition(
                arcId.toString(),
                ReadingHost::class.java.canonicalName!!,
                listOf(readPersonParticle)
            ),
            Plan.Partition(
                arcId.toString(),
                WritingHost::class.java.canonicalName!!,
                listOf(writePersonParticle)
            )
        )
    }

    @Test
    fun allocator_verifyStorageKeysCreated() = runBlockingTest {
        writeAndReadPersonPlan.particles.forEach {
            it.handles.forEach { (_, connection) ->
                assertThat(connection.storageKey).isInstanceOf(CreateableStorageKey::class.java)
            }
        }
        val allocator = Allocator(hostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it.particles }.forEach {
            particle -> particle.handles.forEach { (_, connection) ->
                assertThat(connection.storageKey).isNotInstanceOf(CreateableStorageKey::class.java)
            }
        }
        assertThat(readPersonHandleConnection.storageKey).isEqualTo(writePersonHandleConnection.storageKey)
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
            particle -> particle.handles.forEach { (_, connection) ->
               assertThat(connection.storageKey).isEqualTo(testKey)
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
        val particle = Plan.Particle("UnknownParticle", "Unknown", mapOf())

        val plan = Plan(listOf(particle))
        assertSuspendingThrows(ParticleNotFoundException::class) {
            allocator.startArcForPlan("unknown", plan)
        }
    }
}
