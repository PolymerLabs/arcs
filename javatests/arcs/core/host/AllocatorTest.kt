package arcs.core.host

import arcs.core.common.Id
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.sdk.Particle
import arcs.core.storage.driver.VolatileStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.jvm.host.ServiceLoaderHostRegistry
import com.google.auto.service.AutoService
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

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

    @Target(AnnotationTarget.CLASS)
    @Retention(AnnotationRetention.RUNTIME)
    @TargetHost(WritingHost::class)
    annotation class RunInWritingHost

    @Target(AnnotationTarget.CLASS)
    @Retention(AnnotationRetention.RUNTIME)
    @TargetHost(ReadingHost::class)
    annotation class RunInReadingHost

    @AutoService(Particle::class)
    @RunInWritingHost
    class WritePerson : Particle

    @AutoService(Particle::class)
    @RunInReadingHost
    class ReadPerson : Particle

    open class TestingHost : AbstractArcHost() {
        var started = mutableListOf<PlanPartition>()

        override suspend fun startArc(partition: PlanPartition) {
            super.startArc(partition)
            started.add(partition)
        }

        fun setup() {
            started.clear()
        }
    }

    @AutoService(ArcHost::class)
    class WritingHost : TestingHost()

    @AutoService(ArcHost::class)
    class ReadingHost : TestingHost()

    private lateinit var personHandleSpec: HandleSpec
    private lateinit var readPersonHandleConnectionSpec: HandleConnectionSpec
    private lateinit var writePersonHandleConnectionSpec: HandleConnectionSpec
    private lateinit var writePersonParticleSpec: ParticleSpec
    private lateinit var readPersonParticleSpec: ParticleSpec
    private lateinit var writeAndReadPersonPlan: Plan

    @Before
    fun setUp() {
        runBlocking {
            personHandleSpec =
                HandleSpec(
                    null, "recipePerson", null, mutableSetOf("volatile"),
                    personSchema
                )

            writePersonParticleSpec =
                ParticleSpec("WritePerson", WritePerson::class.java.getCanonicalName()!!)
            writePersonHandleConnectionSpec =
                HandleConnectionSpec("person", personHandleSpec, writePersonParticleSpec)

            readPersonParticleSpec =
                ParticleSpec("ReadPerson", ReadPerson::class.java.getCanonicalName()!!)
            readPersonHandleConnectionSpec =
                HandleConnectionSpec("person", personHandleSpec, readPersonParticleSpec)

            writeAndReadPersonPlan = Plan(
                listOf(writePersonHandleConnectionSpec, readPersonHandleConnectionSpec)
            )

            ServiceLoaderHostRegistry.availableArcHosts().forEach {
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
        val allocator = Allocator(ServiceLoaderHostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        assertThat(planPartitions).containsExactly(
            PlanPartition(
                arcId.toString(),
                ReadingHost::class.java.canonicalName,
                listOf(readPersonHandleConnectionSpec)
            ),
            PlanPartition(
                arcId.toString(),
                WritingHost::class.java.canonicalName,
                listOf(writePersonHandleConnectionSpec)
            )
        )
    }

    @Test
    fun allocator_verifyStorageKeysCreated() = runBlockingTest {
        writeAndReadPersonPlan.handleConnectionSpecs.forEach { it ->
            assertThat(it.handleSpec.storageKey).isNull()
        }
        val allocator = Allocator(ServiceLoaderHostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it -> it.handleConnectionSpecs }
            .forEach { assertThat(it.handleSpec.storageKey).isNotNull() }
    }

    @Test
    fun allocator_verifyStorageKeysNotOverwritten() = runBlockingTest {
        val idGenerator = Id.Generator.newSession()
        val testArcId = idGenerator.newArcId("Test")
        val testKey = VolatileStorageKey(testArcId, "test")

        writeAndReadPersonPlan.handleConnectionSpecs.forEach { it ->
            it.handleSpec.storageKey = testKey
        }

        val allocator = Allocator(ServiceLoaderHostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it -> it.handleConnectionSpecs }
            .forEach { assertThat(it.handleSpec.storageKey).isEqualTo(testKey) }
    }

    @Test
    fun allocator_verifyArcHostStartCalled() = runBlockingTest {
        val allocator = Allocator(ServiceLoaderHostRegistry)
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
        val allocator = Allocator(ServiceLoaderHostRegistry)
        val handleConnectionSpec = HandleConnectionSpec(
            "unknown", personHandleSpec,
            ParticleSpec("UnknownParticle", "Unknown")
        )
        val plan = Plan(listOf(handleConnectionSpec))
        assertSuspendingThrows(ParticleNotFoundException::class) {
            allocator.startArcForPlan("unknown", plan)
        }
    }
}
