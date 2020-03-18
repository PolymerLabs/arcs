package arcs.core.allocator

import arcs.core.common.Id
import arcs.core.data.Capabilities
import arcs.core.data.CreateableStorageKey
import arcs.core.data.Plan
import arcs.core.host.ArcState
import arcs.core.host.HostRegistry
import arcs.core.host.ParticleNotFoundException
import arcs.core.host.ParticleState
import arcs.core.host.PersonPlan
import arcs.core.host.ReadPerson
import arcs.core.host.ReadPerson_Person
import arcs.core.host.TestingJvmProdHost
import arcs.core.host.WritePerson
import arcs.core.host.toRegistration
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.VolatileDriverProvider
import arcs.core.storage.handle.HandleManager
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.plus
import arcs.core.util.traverse
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.util.testutil.TimeImpl
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

@RunWith(JUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
open class AllocatorTestBase {
    /**
     * Recipe hand translated from 'person.arcs'
     */
    private lateinit var allocator: Allocator
    private lateinit var hostRegistry: HostRegistry
    private lateinit var writePersonParticle: Plan.Particle
    private lateinit var readPersonParticle: Plan.Particle

    protected val personSchema = ReadPerson_Person.SCHEMA

    private lateinit var readingExternalHost: TestingHost
    private lateinit var writingExternalHost: TestingHost
    private lateinit var pureHost: TestingJvmProdHost

    private class WritingHost : TestingHost(::WritePerson.toRegistration())
    private class ReadingHost : TestingHost(::ReadPerson.toRegistration())

    /** Return the [ArcHost] that contains [ReadPerson]. */
    open fun readingHost(): TestingHost = ReadingHost()

    /** Return the [ArcHost] that contains [WritePerson]. */
    open fun writingHost(): TestingHost = WritingHost()

    /** Return the [ArcHost] that contains all isolatable [Particle]s. */
    open fun pureHost(): TestingJvmProdHost =
        TestingJvmProdHost()

    open val storageCapability = Capabilities.TiedToRuntime
    open fun runAllocatorTest(
        coroutineContext: CoroutineContext = EmptyCoroutineContext,
        testBody: suspend CoroutineScope.() -> Unit
    ) = runBlocking(coroutineContext) { testBody() }

    open suspend fun hostRegistry(): HostRegistry {
        val registry = ExplicitHostRegistry()
        registry.registerHost(readingExternalHost)
        registry.registerHost(writingExternalHost)
        registry.registerHost(pureHost)

        return registry
    }

    @Before
    open fun setUp() = runBlocking {
        RamDisk.clear()
        RamDiskStorageKey.registerKeyCreator()
        RamDiskDriverProvider()

        VolatileStorageKey.registerKeyCreator()

        readingExternalHost = readingHost()
        writingExternalHost = writingHost()
        pureHost = pureHost()

        hostRegistry = hostRegistry()
        allocator = Allocator.create(hostRegistry, TimeImpl(), HandleManager(TimeImpl()))

        readPersonParticle =
            requireNotNull(PersonPlan.particles.find { it.particleName == "ReadPerson" }) {
                "No ReadPerson particle in PersonPlan"
            }

        writePersonParticle =
            requireNotNull(PersonPlan.particles.find { it.particleName == "WritePerson" }) {
                "No WritePerson particle in PersonPlan"
            }

        readingExternalHost.setup()
        writingExternalHost.setup()
    }

    /**
     * Tests that the Recipe is properly partitioned so that [ReadingHost] contains only
     * [ReadPerson] with associated handles and connections, and [WritingHost] contains only
     * [WritePerson] with associated handles and connections.
     */
    @Test
    fun allocator_computePartitions() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(
            "readWritePerson",
            PersonPlan
        )
        val planPartitions = allocator.getPartitionsFor(arcId)!!

        val readingHost = requireNotNull(
            hostRegistry.availableArcHosts().first { it.hostId.contains("Reading") }
        )

        val writingHost = requireNotNull(
            hostRegistry.availableArcHosts().first { it.hostId.contains("Writing") }
        )

        val prodHost = requireNotNull(
            hostRegistry.availableArcHosts().first { it.hostId.contains("Prod") }
        )

        val allStorageKeyLens =
            Plan.Particle.handlesLens.traverse() + Plan.HandleConnection.storageKeyLens

        // fetch the allocator replaced key
        val readPersonKey = findPartitionFor(
            planPartitions, "ReadPerson"
        ).particles[0].handles["person"]?.storageKey!!

        val writePersonKey = findPartitionFor(
            planPartitions, "WritePerson"
        ).particles[0].handles["person"]?.storageKey!!

        val purePartition = findPartitionFor(planPartitions, "PurePerson")!!

        val storageKeyLens = Plan.HandleConnection.storageKeyLens

        assertThat(planPartitions).containsExactly(
            Plan.Partition(
                arcId.toString(),
                readingHost.hostId,
                // replace the CreateableKeys with the allocated keys
                listOf(allStorageKeyLens.mod(readPersonParticle) { readPersonKey })
            ),
            Plan.Partition(
                arcId.toString(),
                prodHost.hostId,
                // replace the CreateableKeys with the allocated keys
                listOf(Plan.Particle.handlesLens.mod(purePartition.particles[0]) {
                    mapOf(
                        "inputPerson" to storageKeyLens.mod(it["inputPerson"]!!) { writePersonKey },
                        "outputPerson" to storageKeyLens.mod(it["outputPerson"]!!) { readPersonKey }
                    )
                })
            ),
            Plan.Partition(
                arcId.toString(),
                writingHost.hostId,
                // replace the CreateableKeys with the allocated keys
                listOf(allStorageKeyLens.mod(writePersonParticle) { writePersonKey })
            )
        )
    }

    @Test
    fun allocator_verifyStorageKeysCreated() = runAllocatorTest {
        PersonPlan.particles.forEach {
            it.handles.forEach { (_, connection) ->
                assertThat(connection.storageKey).isInstanceOf(CreateableStorageKey::class.java)
            }
        }
        val arcId = allocator.startArcForPlan("readWritePerson", PersonPlan)
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it.particles }.forEach { particle ->
            particle.handles.forEach { (_, connection) ->
                assertThat(connection.storageKey).isNotInstanceOf(
                    CreateableStorageKey::class.java
                )
            }
        }
        val readPartition = findPartitionFor(planPartitions, "ReadPerson")
        val purePartition = findPartitionFor(planPartitions, "PurePerson")
        val writePartition = findPartitionFor(planPartitions, "WritePerson")

        assertThat(readPartition.particles[0]?.handles["person"]?.storageKey).isEqualTo(
            purePartition.particles[0]?.handles["outputPerson"]?.storageKey
        )

        assertThat(writePartition.particles[0]?.handles["person"]?.storageKey).isEqualTo(
            purePartition.particles[0]?.handles["inputPerson"]?.storageKey
        )
    }

    private fun findPartitionFor(
        partitions: List<Plan.Partition>,
        particleName: String
    ) = partitions.find {
        it.particles.any {
                p -> p.particleName == particleName
        }
    }!!

    @Test
    fun allocator_verifyStorageKeysNotOverwritten() = runAllocatorTest {
        val idGenerator = Id.Generator.newSession()
        val testArcId = idGenerator.newArcId("Test")
        VolatileDriverProvider(testArcId)
        val testKey = CapabilitiesResolver(
            CapabilitiesResolver.CapabilitiesResolverOptions(testArcId)
        ).createStorageKey(Capabilities.TiedToArc, personSchema, "readWritePerson")

        val allStorageKeyLens =
            Plan.particleLens.traverse() + Plan.Particle.handlesLens.traverse() +
                Plan.HandleConnection.storageKeyLens

        val testPlan = allStorageKeyLens.mod(PersonPlan) { testKey!! }

        val arcId = allocator.startArcForPlan(
            "readWritePerson",
            testPlan
        )
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it.particles }.forEach {
            particle -> particle.handles.forEach { (_, connection) ->
               assertThat(connection.storageKey).isEqualTo(testKey)
            }
        }
    }

    @Test
    fun allocator_verifyArcHostStartCalled() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(
            "readWritePerson",
            PersonPlan
        )
        val planPartitions = allocator.getPartitionsFor(arcId)!!

        val readingHost = requireNotNull(
            hostRegistry.availableArcHosts().first { it.hostId.contains("Reading") }
        )

        val writingHost = requireNotNull(
            hostRegistry.availableArcHosts().first { it.hostId.contains("Writing") }
        )

        val prodHost = requireNotNull(
            hostRegistry.availableArcHosts().first { it.hostId.contains("Prod") }
        )

        planPartitions.forEach {
            val host = allocator.lookupArcHost(it.arcHost)
            when (host.hostId) {
                readingHost.hostId ->
                    assertThat(readingExternalHost.started).containsExactly(it)
                writingHost.hostId ->
                    assertThat(writingExternalHost.started).containsExactly(it)
                prodHost.hostId ->
                    assertThat(pureHost.started).containsExactly(it)
                else -> {
                    assert(false)
                }
            }
        }
    }

    @Test
    fun allocator_verifyUnknownParticleThrows() = runAllocatorTest {
        val particle = Plan.Particle("UnknownParticle", "Unknown", mapOf())

        val plan = Plan(listOf(particle))
        assertSuspendingThrows(ParticleNotFoundException::class) {
            allocator.startArcForPlan("unknown", plan)
        }
    }

    @Test
    fun allocator_canStartArcInTwoExternalHosts() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(
            "readWriteParticle", PersonPlan
        )

        assertThat(readingExternalHost.started.size).isEqualTo(1)
        assertThat(writingExternalHost.started.size).isEqualTo(1)

        assertThat(allocator.getPartitionsFor(arcId)).contains(
            readingExternalHost.started.first()
        )
        assertThat(allocator.getPartitionsFor(arcId)).contains(
            writingExternalHost.started.first()
        )

        val readingContext = requireNotNull(
            readingExternalHost.arcHostContext(arcId.toString())
        )
        val writingContext = requireNotNull(
            writingExternalHost.arcHostContext(arcId.toString())
        )

        assertThat(readingContext.arcState).isEqualTo(ArcState.Running)
        assertThat(writingContext.arcState).isEqualTo(ArcState.Running)

        val readPersonContext = requireNotNull(
            readingContext.particles[readPersonParticle.particleName]
        )

        val writePersonContext = requireNotNull(
            writingContext.particles[writePersonParticle.particleName]
        )

        assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Started)
        assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Started)

        writePersonContext.particle.let { particle ->
            particle as WritePerson
            particle.await()
            assertThat(particle.createCalled).isTrue()
            assertThat(particle.wrote).isTrue()
        }

        readPersonContext.particle.let { particle ->
            particle as ReadPerson
            particle.await()
            assertThat(particle.createCalled).isTrue()
            assertThat(particle.name).isEqualTo("Hello John Wick")
        }
    }

    @Test
    fun allocator_canStopArcInTwoExternalHosts() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(
            "readWriteParticle",
            PersonPlan
        )

        val readingContext = requireNotNull(
            readingExternalHost.arcHostContext(arcId.toString())
        )
        val writingContext = requireNotNull(
            writingExternalHost.arcHostContext(arcId.toString())
        )

        assertThat(readingContext.arcState).isEqualTo(ArcState.Running)
        assertThat(writingContext.arcState).isEqualTo(ArcState.Running)

        allocator.stopArc(arcId)

        assertThat(readingContext.arcState).isEqualTo(ArcState.Stopped)
        assertThat(writingContext.arcState).isEqualTo(ArcState.Stopped)

        val readPersonContext = requireNotNull(
            readingContext.particles[readPersonParticle.particleName]
        )

        val writePersonContext = requireNotNull(
            writingContext.particles[writePersonParticle.particleName]
        )

        assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Stopped)
        assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Stopped)

        assertThat((writePersonContext.particle as WritePerson).shutdownCalled).isTrue()
        assertThat((readPersonContext.particle as ReadPerson).shutdownCalled).isTrue()

        assertThat(readingExternalHost.isIdle).isTrue()
        assertThat(writingExternalHost.isIdle).isTrue()
    }

    @Test
    fun allocator_restartArcInTwoExternalHosts() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(
            "readWriteParticle",
            PersonPlan
        )

        val readingContext = requireNotNull(
            readingExternalHost.arcHostContext(arcId.toString())
        )
        val writingContext = requireNotNull(
            writingExternalHost.arcHostContext(arcId.toString())
        )

        assertThat(readingContext.arcState).isEqualTo(ArcState.Running)
        assertThat(writingContext.arcState).isEqualTo(ArcState.Running)

        allocator.stopArc(arcId)

        assertThat(readingContext.arcState).isEqualTo(ArcState.Stopped)
        assertThat(writingContext.arcState).isEqualTo(ArcState.Stopped)

        allocator.startArcForPlan(
            "readWriteParticle",
            Plan(PersonPlan.particles, arcId.toString())
        )

        val readingContextAfter = requireNotNull(
            readingExternalHost.arcHostContext(arcId.toString())
        )
        val writingContextAfter = requireNotNull(
            writingExternalHost.arcHostContext(arcId.toString())
        )

        assertThat(readingContextAfter.arcState).isEqualTo(ArcState.Running)
        assertThat(writingContextAfter.arcState).isEqualTo(ArcState.Running)

        val readPersonContext = requireNotNull(
            readingContextAfter.particles[readPersonParticle.particleName]
        )

        val writePersonContext = requireNotNull(
            writingContextAfter.particles[writePersonParticle.particleName]
        )

        assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Started)
        assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Started)

        // onCreate() not called a second time
        assertThat((writePersonContext.particle as WritePerson).createCalled).isFalse()
        assertThat((readPersonContext.particle as ReadPerson).createCalled).isFalse()
    }

    @Test
    fun allocator_restartCrashedArcInTwoExternalHosts() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(
            "readWriteParticle",
            PersonPlan
        )

        val readingContext = requireNotNull(
            readingExternalHost.arcHostContext(arcId.toString())
        )
        val writingContext = requireNotNull(
            writingExternalHost.arcHostContext(arcId.toString())
        )

        assertThat(readingContext.arcState).isEqualTo(ArcState.Running)
        assertThat(writingContext.arcState).isEqualTo(ArcState.Running)

        readingExternalHost.stopArc(readingExternalHost.started.first())
        writingExternalHost.stopArc(writingExternalHost.started.first())

        assertThat(readingContext.arcState).isEqualTo(ArcState.Stopped)
        assertThat(writingContext.arcState).isEqualTo(ArcState.Stopped)

        // This erases the internally held-in-memory-cache ArcHost state simulating a crash
        readingExternalHost.setup()
        writingExternalHost.setup()

        allocator.startArcForPlan(
            "readWriteParticle",
            Plan(PersonPlan.particles, arcId.toString())
        )

        val readingContextAfter = requireNotNull(
            readingExternalHost.arcHostContext(arcId.toString())
        )
        val writingContextAfter = requireNotNull(
            writingExternalHost.arcHostContext(arcId.toString())
        )

        assertThat(readingContextAfter.arcState).isEqualTo(ArcState.Running)
        assertThat(writingContextAfter.arcState).isEqualTo(ArcState.Running)

        val readPersonContext = requireNotNull(
            readingContextAfter.particles[readPersonParticle.particleName]
        )

        val writePersonContext = requireNotNull(
            writingContextAfter.particles[writePersonParticle.particleName]
        )

        assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Started)
        assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Started)

        // onCreate() not called a second time
        assertThat((writePersonContext.particle as WritePerson).createCalled).isFalse()
        assertThat((readPersonContext.particle as ReadPerson).createCalled).isFalse()
    }
}
