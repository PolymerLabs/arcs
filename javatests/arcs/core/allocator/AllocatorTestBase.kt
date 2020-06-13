package arcs.core.allocator

import arcs.core.common.ArcId
import arcs.core.common.Id
import arcs.core.data.Capabilities
import arcs.core.data.CreateableStorageKey
import arcs.core.data.EntityType
import arcs.core.data.Plan
import arcs.core.host.*
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.VolatileDriverProvider
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.util.Log
import arcs.core.util.plus
import arcs.core.util.testutil.LogRule
import arcs.core.util.traverse
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmSchedulerProvider
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import java.lang.IllegalArgumentException
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
open class AllocatorTestBase {
    @get:Rule
    val log = LogRule(Log.Level.Warning)

    private val schedulerProvider = JvmSchedulerProvider(EmptyCoroutineContext)

    /**
     * Recipe hand translated from 'person.arcs'
     */
    protected lateinit var allocator: Allocator
    private lateinit var hostRegistry: HostRegistry
    private lateinit var writePersonParticle: Plan.Particle
    private lateinit var readPersonParticle: Plan.Particle

    protected val personSchema = ReadPerson_Person.SCHEMA

    private lateinit var readingExternalHost: TestingHost
    private lateinit var writingExternalHost: TestingHost
    private lateinit var pureHost: TestingJvmProdHost

    private class WritingHost : TestingHost(
        JvmSchedulerProvider(EmptyCoroutineContext),
        ::WritePerson.toRegistration()
    )

    private class ReadingHost : TestingHost(
        JvmSchedulerProvider(EmptyCoroutineContext),
        ::ReadPerson.toRegistration()
    )

    /** Return the [ArcHost] that contains [ReadPerson]. */
    open fun readingHost(): TestingHost = ReadingHost()

    /** Return the [ArcHost] that contains [WritePerson]. */
    open fun writingHost(): TestingHost = WritingHost()

    /** Return the [ArcHost] that contains all isolatable [Particle]s. */
    open fun pureHost() = TestingJvmProdHost(schedulerProvider)

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
        DriverAndKeyConfigurator.configureKeyParsers()
        RamDiskDriverProvider()

        readingExternalHost = readingHost()
        writingExternalHost = writingHost()
        pureHost = pureHost()

        hostRegistry = hostRegistry()
        allocator = Allocator.create(
            hostRegistry,
            EntityHandleManager(
                time = FakeTime(),
                scheduler = schedulerProvider("allocator")
            )
        )

        readPersonParticle =
            requireNotNull(PersonPlan.particles.find { it.particleName == "ReadPerson" }) {
                "No ReadPerson particle in PersonPlan"
            }

        writePersonParticle =
            requireNotNull(PersonPlan.particles.find { it.particleName == "WritePerson" }) {
                "No WritePerson particle in PersonPlan"
            }

        readingExternalHost.setup()
        pureHost.setup()
        writingExternalHost.setup()
        WritePerson.throws = false
    }

    private suspend fun assertAllStatus(
        arcId: ArcId,
        arcState: ArcState,
        testAllocator: Allocator = allocator
    ) {
        requireNotNull(testAllocator.getPartitionsFor(arcId)) {
            "No Partitions for $arcId"
        }.forEach { partition ->
            val hostId = partition.arcHost
            val status = when {
                hostId.contains("Reading") -> readingExternalHost.lookupArcHostStatus(partition)
                hostId.contains("Prod") -> pureHost.lookupArcHostStatus(partition)
                hostId.contains("Writing") -> writingExternalHost.lookupArcHostStatus(partition)
                else -> throw IllegalArgumentException("Unknown ${partition.arcHost}")
            }
            assertThat(status).isEqualTo(arcState)
        }
    }

    /**
     * Tests that the Recipe is properly partitioned so that [ReadingHost] contains only
     * [ReadPerson] with associated handles and connections, and [WritingHost] contains only
     * [WritePerson] with associated handles and connections.
     */
    @Test
    open fun allocator_computePartitions() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(PersonPlan).waitForStart().id
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

        val purePartition = findPartitionFor(planPartitions, "PurePerson")

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
    open fun allocator_verifyStorageKeysCreated() = runAllocatorTest {
        PersonPlan.particles.forEach {
            it.handles.forEach { (_, connection) ->
                assertThat(connection.storageKey).isInstanceOf(CreateableStorageKey::class.java)
            }
        }
        log("Plan handles are using correct storage keys")
        val arcId = allocator.startArcForPlan(PersonPlan).waitForStart().id

        log("Arc started.")
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it.particles }.forEach { particle ->
            particle.handles.forEach { (_, connection) ->
                assertThat(connection.storageKey).isNotInstanceOf(
                    CreateableStorageKey::class.java
                )
            }
        }
        log("Particle handles are using correct storage key types")
        val readPartition = findPartitionFor(planPartitions, "ReadPerson")
        val purePartition = findPartitionFor(planPartitions, "PurePerson")
        val writePartition = findPartitionFor(planPartitions, "WritePerson")

        assertThat(readPartition.particles[0].handles["person"]?.storageKey).isEqualTo(
            purePartition.particles[0].handles["outputPerson"]?.storageKey
        )

        assertThat(writePartition.particles[0].handles["person"]?.storageKey).isEqualTo(
            purePartition.particles[0].handles["inputPerson"]?.storageKey
        )

        assertThat(purePartition.particles[0].handles["inputPerson"]?.storageKey).isNotEqualTo(
            purePartition.particles[0].handles["outputPerson"]?.storageKey
        )
    }

    private fun findPartitionFor(
        partitions: List<Plan.Partition>,
        particleName: String
    ) = partitions.find { partition ->
        partition.particles.any { it.particleName == particleName }
    }!!

    @Test
    open fun allocator_verifyStorageKeysNotOverwritten() = runAllocatorTest {
        val idGenerator = Id.Generator.newSession()
        val testArcId = idGenerator.newArcId("Test")
        VolatileDriverProvider(testArcId)

        val inputPerson = CapabilitiesResolver(
            CapabilitiesResolver.CapabilitiesResolverOptions(testArcId)
        ).createStorageKey(Capabilities.TiedToArc, EntityType(personSchema), "inputPerson")

        val outputPerson = CapabilitiesResolver(
            CapabilitiesResolver.CapabilitiesResolverOptions(testArcId)
        ).createStorageKey(Capabilities.TiedToArc, EntityType(personSchema), "outputPerson")

        val allStorageKeyLens =
            Plan.particleLens.traverse() + Plan.Particle.handlesLens.traverse() +
                Plan.HandleConnection.storageKeyLens

        val testPlan = allStorageKeyLens.mod(PersonPlan) { storageKey ->
            storageKey as CreateableStorageKey
            when (storageKey.nameFromManifest) {
                "inputPerson" -> inputPerson!!
                "outputPerson" -> outputPerson!!
                else -> storageKey
            }
        }

        val arcId = allocator.startArcForPlan(testPlan).waitForStart().id

        val planPartitions = allocator.getPartitionsFor(arcId)!!

        val testKeys = listOf(inputPerson, outputPerson)

        planPartitions.flatMap { it.particles }.forEach {
            particle -> particle.handles.forEach { (_, connection) ->
               assertThat(connection.storageKey).isIn(testKeys)
            }
        }
    }

    @Test
    open fun allocator_verifyArcHostStartCalled() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(PersonPlan).waitForStart().id

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
        val particleLens = Plan.particleLens.traverse()

        val plan = particleLens.mod(PersonPlan) { particle ->
            particle.copy(
                particleName = "Unknown ${particle.particleName}",
                location = "unknown.${particle.location}"
            )
        }
        assertSuspendingThrows(ParticleNotFoundException::class) {
            allocator.startArcForPlan(plan).waitForStart()
        }
    }

    @Test
    open fun allocator_canStartArcInTwoExternalHosts() = runAllocatorTest {
        val arc = allocator.startArcForPlan(PersonPlan)
        val arcId = arc.id

        arc.waitForStart()

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

        assertAllStatus(arcId, ArcState.Running)

        val readPersonContext = requireNotNull(
            readingContext.particles[readPersonParticle.particleName]
        )

        val writePersonContext = requireNotNull(
            writingContext.particles[writePersonParticle.particleName]
        )

        assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Running)
        assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Running)

        writePersonContext.particle.let { particle ->
            particle as WritePerson
            particle.await()
            assertThat(particle.firstStartCalled).isTrue()
            assertThat(particle.wrote).isTrue()
        }

        readPersonContext.particle.let { particle ->
            particle as ReadPerson
            particle.await()
            assertThat(particle.firstStartCalled).isTrue()
            assertThat(particle.name).isEqualTo("Hello John Wick")
        }
    }

    @Test
    open fun allocator_canStopArcInTwoExternalHosts() = runAllocatorTest {
        val arc = allocator.startArcForPlan(PersonPlan)
        val arcId = arc.id

        arc.waitForStart()

        val readingContext = requireNotNull(
            readingExternalHost.arcHostContext(arcId.toString())
        )
        val writingContext = requireNotNull(
            writingExternalHost.arcHostContext(arcId.toString())
        )

        assertAllStatus(arcId, ArcState.Running)

        arc.stop()
        arc.waitForStop()

        assertAllStatus(arcId, ArcState.Stopped)

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
    open fun allocator_restartArcInTwoExternalHosts() = runAllocatorTest {
        val arc = allocator.startArcForPlan(PersonPlan)
        val arcId = arc.waitForStart().id

        assertAllStatus(arcId, ArcState.Running)

        arc.stop()
        arc.waitForStop()

        assertAllStatus(arcId, ArcState.Stopped)

        val arc2 = allocator.startArcForPlan(Plan(PersonPlan.particles, arcId.toString()))
        arc2.waitForStart()

        val readingContextAfter = requireNotNull(
            readingExternalHost.arcHostContext(arcId.toString())
        )
        val writingContextAfter = requireNotNull(
            writingExternalHost.arcHostContext(arcId.toString())
        )

        assertAllStatus(arcId, ArcState.Running)

        val readPersonContext = requireNotNull(
            readingContextAfter.particles[readPersonParticle.particleName]
        )

        val writePersonContext = requireNotNull(
            writingContextAfter.particles[writePersonParticle.particleName]
        )

        assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Running)
        assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Running)

        // onFirstStart() not called a second time
        assertThat((writePersonContext.particle as WritePerson).firstStartCalled).isFalse()
        assertThat((readPersonContext.particle as ReadPerson).firstStartCalled).isFalse()
    }

    @Test
    open fun allocator_startFromOneAllocatorAndStopInAnother() = runAllocatorTest {
        val arc = allocator.startArcForPlan(PersonPlan).waitForStart()
        val arcId = arc.id

        val readingContext = requireNotNull(
            readingExternalHost.arcHostContext(arcId.toString())
        )
        val writingContext = requireNotNull(
            writingExternalHost.arcHostContext(arcId.toString())
        )

        assertAllStatus(arcId, ArcState.Running)

        val allocator2 = Allocator.create(
            hostRegistry,
            EntityHandleManager(
                time = FakeTime(),
                scheduler = schedulerProvider("allocator2")
            )
        )

        allocator2.stopArc(arcId)
        arc.waitForStop()

        assertThat(readingContext.arcState).isEqualTo(ArcState.Stopped)
        assertThat(writingContext.arcState).isEqualTo(ArcState.Stopped)
    }

    @Test
    open fun allocator_doesntCreateArcsOnDuplicateStartArc() = runAllocatorTest {
        val arc = allocator.startArcForPlan(PersonPlan)
        val arcId = arc.waitForStart().id

        assertAllStatus(arcId, ArcState.Running)

        readingExternalHost.stopArc(readingExternalHost.started.first())
        pureHost.stopArc(pureHost.started.first())
        writingExternalHost.stopArc(writingExternalHost.started.first())

        arc.waitForStop()
        assertAllStatus(arcId, ArcState.Stopped)

        // This erases the internally held-in-memory-cache ArcHost state simulating a crash
        readingExternalHost.setup()
        pureHost.setup()
        writingExternalHost.setup()

        val arc2 = allocator.startArcForPlan(Plan(PersonPlan.particles, arcId.toString()))

        arc2.waitForStop()
        assertThat(arc.arcState).isEqualTo(ArcState.Stopped)
    }

    @Test
    open fun allocator_startArc_particleException_isErrorState() = runAllocatorTest {
        WritePerson.throws = true
        val deferred = CompletableDeferred<Boolean>()
        val arc = allocator.startArcForPlan(PersonPlan)
        arc.onError { deferred.complete(true) }
        deferred.await()
        assertThat(writingExternalHost.arcHostContext(arc.id.toString())?.arcState).isEqualTo(
            ArcState.Error
        )
    }
}
