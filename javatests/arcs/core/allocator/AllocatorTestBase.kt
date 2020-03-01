package arcs.core.allocator

import arcs.core.common.Id
import arcs.core.data.Capabilities
import arcs.core.data.CreateableStorageKey
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.SingletonType
import arcs.core.host.ArcState
import arcs.core.host.HostRegistry
import arcs.core.host.ParticleNotFoundException
import arcs.core.host.ParticleState
import arcs.core.host.ReadPerson
import arcs.core.host.WritePerson
import arcs.core.host.toRegistration
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.StorageKey
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.driver.VolatileDriverProvider
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.type.Type
import arcs.jvm.host.ExplicitHostRegistry
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
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
    private lateinit var recipePersonStorageKey: StorageKey
    private lateinit var allocator: Allocator
    private lateinit var hostRegistry: HostRegistry
    private lateinit var readPersonHandleConnection: Plan.HandleConnection
    private lateinit var writePersonHandleConnection: Plan.HandleConnection
    private lateinit var writePersonParticle: Plan.Particle
    private lateinit var readPersonParticle: Plan.Particle
    private lateinit var writeAndReadPersonPlan: Plan
    protected val personSchema = Schema(
        listOf(SchemaName("Person")),
        SchemaFields(mapOf("name" to FieldType.Text), emptyMap()),
        "42"
    )
    private var personEntityType: Type = SingletonType(EntityType(personSchema))

    private lateinit var readingExternalHost: TestingHost
    private lateinit var writingExternalHost: TestingHost

    private class WritingHost : TestingHost(::WritePerson.toRegistration())
    private class ReadingHost : TestingHost(::ReadPerson.toRegistration())

    /** Return the [ArcHost] that contains [ReadPerson]. */
    open fun readingHost(): TestingHost = ReadingHost()

    /** Return the [ArcHost] that contains [WritePerson]. */
    open fun writingHost(): TestingHost = WritingHost()

    open val storageCapability = Capabilities.TiedToRuntime
    open fun runAllocatorTest(
        coroutineContext: CoroutineContext = EmptyCoroutineContext,
        testBody: suspend TestCoroutineScope.() -> Unit
    ) = runBlockingTest(coroutineContext, testBody)

    open suspend fun hostRegistry(): HostRegistry {
        val registry = ExplicitHostRegistry()
        registry.registerHost(readingExternalHost)
        registry.registerHost(writingExternalHost)
        return registry
    }

    @Before
    open fun setUp() = runBlocking {
        RamDisk.clear()
        RamDiskDriverProvider()

        readingExternalHost = readingHost()
        writingExternalHost = writingHost()

        hostRegistry = hostRegistry()
        allocator = Allocator(hostRegistry)

        recipePersonStorageKey = CreateableStorageKey(
            "recipePerson", storageCapability
        )
        writePersonHandleConnection =
            Plan.HandleConnection(recipePersonStorageKey, personEntityType)

        writePersonParticle = Plan.Particle(
            "WritePerson", WritePerson::class.java.getCanonicalName()!!,
            mapOf("person" to writePersonHandleConnection)
        )

        readPersonHandleConnection = Plan.HandleConnection(recipePersonStorageKey, personEntityType)

        readPersonParticle = Plan.Particle(
            "ReadPerson", ReadPerson::class.java.getCanonicalName()!!,
            mapOf("person" to readPersonHandleConnection)
        )

        writeAndReadPersonPlan = Plan(
            listOf(writePersonParticle, readPersonParticle)
        )

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
        val allocator = Allocator(hostRegistry)
        val arcId = allocator.startArcForPlan(
            "readWritePerson",
            writeAndReadPersonPlan
        )
        val planPartitions = allocator.getPartitionsFor(arcId)!!

        val readingHost = requireNotNull(
            hostRegistry.availableArcHosts().first { it.hostId.contains("Reading") }
        )

        val writingHost = requireNotNull(
            hostRegistry.availableArcHosts().first { it.hostId.contains("Writing") }
        )

        assertThat(planPartitions).containsExactly(
            Plan.Partition(
                arcId.toString(),
                readingHost.hostId,
                listOf(readPersonParticle)
            ),
            Plan.Partition(
                arcId.toString(),
                writingHost.hostId,
                listOf(writePersonParticle)
            )
        )
    }

    @Test
    fun allocator_verifyStorageKeysCreated() = runAllocatorTest {
        writeAndReadPersonPlan.particles.forEach {
            it.handles.forEach { (_, connection) ->
                assertThat(connection.storageKey).isInstanceOf(CreateableStorageKey::class.java)
            }
        }
        val allocator = Allocator(hostRegistry)
        val arcId = allocator.startArcForPlan(
            "readWritePerson", writeAndReadPersonPlan
        )
        val planPartitions = allocator.getPartitionsFor(arcId)!!
        planPartitions.flatMap { it.particles }.forEach { particle ->
            particle.handles.forEach { (_, connection) ->
                assertThat(connection.storageKey).isNotInstanceOf(
                    CreateableStorageKey::class.java
                )
            }
        }
        assertThat(readPersonHandleConnection.storageKey).isEqualTo(
            writePersonHandleConnection.storageKey
        )

    }

    @Test
    fun allocator_verifyStorageKeysNotOverwritten() = runAllocatorTest {
        val idGenerator = Id.Generator.newSession()
        val testArcId = idGenerator.newArcId("Test")
        VolatileDriverProvider(testArcId)
        val testKey = CapabilitiesResolver(
            CapabilitiesResolver.CapabilitiesResolverOptions(testArcId)
        ).createStorageKey(Capabilities.TiedToArc, personSchema, "readWritePerson")

        writeAndReadPersonPlan.particles.forEach { it ->
            it.handles.getValue("person").storageKey = testKey!!
        }

        val allocator = Allocator(hostRegistry)
        val arcId = allocator.startArcForPlan(
            "readWritePerson",
            writeAndReadPersonPlan
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
        val allocator = Allocator(hostRegistry)
        val arcId = allocator.startArcForPlan(
            "readWritePerson",
            writeAndReadPersonPlan
        )
        val planPartitions = allocator.getPartitionsFor(arcId)!!

        val readingHost = requireNotNull(
            hostRegistry.availableArcHosts().first { it.hostId.contains("Reading") }
        )

        val writingHost = requireNotNull(
            hostRegistry.availableArcHosts().first { it.hostId.contains("Writing") }
        )

        planPartitions.forEach {
            val host = allocator.lookupArcHost(it.arcHost)
            when (host.hostId) {
                readingHost.hostId ->
                    assertThat(readingExternalHost.started).containsExactly(it)
                writingHost.hostId ->
                    assertThat(writingExternalHost.started).containsExactly(it)
                else -> {
                    assert(false)
                }
            }
        }
    }

    @Test
    fun allocator_verifyUnknownParticleThrows() = runAllocatorTest {
        val allocator = Allocator(hostRegistry)
        val particle = Plan.Particle("UnknownParticle", "Unknown", mapOf())

        val plan = Plan(listOf(particle))
        assertSuspendingThrows(ParticleNotFoundException::class) {
            allocator.startArcForPlan("unknown", plan)
        }
    }

    @Test
    fun allocator_canStartArcInTwoExternalHosts() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(
            "readWriteParticle",
            writeAndReadPersonPlan
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
            readingContext.particles[readPersonParticle]
        )

        val writePersonContext = requireNotNull(
            writingContext.particles[writePersonParticle]
        )

        assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Started)
        assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Started)

        assertThat((writePersonContext.particle as WritePerson).createCalled).isTrue()
        assertThat((writePersonContext.particle as WritePerson).wrote).isTrue()

        assertThat((readPersonContext.particle as ReadPerson).createCalled).isTrue()
        assertThat((readPersonContext.particle as ReadPerson).name).isEqualTo("John Wick")
    }

    @Test
    fun allocator_canStopArcInTwoExternalHosts() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(
            "readWriteParticle",
            writeAndReadPersonPlan
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

        val readPersonContext = requireNotNull(
            readingContext.particles[readPersonParticle]
        )

        val writePersonContext = requireNotNull(
            writingContext.particles[writePersonParticle]
        )

        assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Stopped)
        assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Stopped)

        assertThat((writePersonContext.particle as WritePerson).shutdownCalled).isTrue()
        assertThat((readPersonContext.particle as ReadPerson).shutdownCalled).isTrue()
    }

    @Test
    fun allocator_restartArcInTwoExternalHosts() = runAllocatorTest {
        val arcId = allocator.startArcForPlan(
            "readWriteParticle",
            writeAndReadPersonPlan
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

        readingExternalHost.startArc(readingExternalHost.started.first())
        writingExternalHost.startArc(writingExternalHost.started.first())

        assertThat(readingContext.arcState).isEqualTo(ArcState.Running)
        assertThat(writingContext.arcState).isEqualTo(ArcState.Running)

        val readPersonContext = requireNotNull(
            readingContext.particles[readPersonParticle]
        )

        val writePersonContext = requireNotNull(
            writingContext.particles[writePersonParticle]
        )

        assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Started)
        assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Started)

        // onCreate() not called a second time
        assertThat((writePersonContext.particle as WritePerson).createCalled).isFalse()
        assertThat((readPersonContext.particle as ReadPerson).createCalled).isFalse()
    }
}
