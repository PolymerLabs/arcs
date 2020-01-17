package arcs.core.host

import arcs.core.common.Id
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.sdk.Particle
import arcs.core.storage.driver.VolatileStorageKey
import arcs.jvm.host.ServiceLoaderHostRegistry
import com.google.auto.service.AutoService
import com.google.common.truth.Truth.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
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
        SchemaFields(setOf("name"), emptySet()),
        SchemaDescription()
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

        override fun startArc(partition: PlanPartition) {
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
            listOf(personHandleSpec), listOf(writePersonParticleSpec, readPersonParticleSpec),
            listOf(writePersonHandleConnectionSpec, readPersonHandleConnectionSpec)
        )

        ServiceLoaderHostRegistry.availableArcHosts.forEach {
            when (it) {
                is TestingHost -> it.setup()
                else -> {}
            }
        }
    }

    /**
     * Tests that the Recipe is properly partitioned so that [ReadingHost] contains only
     * [ReadPerson] with associated handles and connections, and [WritingHost] contains only
     * [WritePerson] with associated handles and connections.
     */
    @Test
    fun allocator_computePartitions() {
        val allocator = Allocator(ServiceLoaderHostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        assertThat(planPartitions.size).isEqualTo(2)
        planPartitions.forEach {
            assertThat(it.arcId).isEqualTo(arcId.toString())
            when (it.arcHost) {
                is ReadingHost -> {
                    assertThat(it.handleSpecs).containsExactly(personHandleSpec)
                    assertThat(it.handleConnectionSpecs).containsExactly(
                        readPersonHandleConnectionSpec
                    )
                    assertThat(it.particleSpecs).containsExactly(readPersonParticleSpec)
                }
                is WritingHost -> {
                    assertThat(it.handleSpecs).containsExactly(personHandleSpec)
                    assertThat(it.handleConnectionSpecs).containsExactly(
                        writePersonHandleConnectionSpec
                    )
                    assertThat(it.particleSpecs).containsExactly(writePersonParticleSpec)
                }
                else -> {
                    assert(false)
                }
            }
        }
    }

    @Test
    fun allocator_verifyStorageKeysCreated() {
        writeAndReadPersonPlan.handleSpecs.forEach { it ->
            assertThat(it.storageKey).isNull()
        }
        val allocator = Allocator(ServiceLoaderHostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it -> it.handleSpecs }
            .forEach { assertThat(it.storageKey).isNotNull() }
    }

    @Test
    fun allocator_verifyStorageKeysNotOverwritten() {
        val idGenerator = Id.Generator.newSession()
        val testArcId = idGenerator.newArcId("Test")
        val testKey = VolatileStorageKey(testArcId, "test")

        writeAndReadPersonPlan.handleSpecs.forEach { it ->
            it.storageKey = testKey
        }

        val allocator = Allocator(ServiceLoaderHostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it -> it.handleSpecs }
            .forEach { assertThat(it.storageKey).isEqualTo(testKey) }
    }

    @Test
    fun allocator_verifyArcHostStartCalled() {
        val allocator = Allocator(ServiceLoaderHostRegistry)
        val arcId = allocator.startArcForPlan("readWritePerson", writeAndReadPersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.forEach {
            when (it.arcHost) {
                is TestingHost ->
                    assertThat((it.arcHost as TestingHost).started).containsExactly(it)
                else -> {}
            }
        }
    }
}
