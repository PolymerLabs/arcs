package arcs.core.allocator

import arcs.core.common.Id
import arcs.core.data.Annotation
import arcs.core.data.Capabilities
import arcs.core.data.Capability.Shareable
import arcs.core.data.CreatableStorageKey
import arcs.core.data.EntityType
import arcs.core.data.Plan
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.host.ArcHostContext
import arcs.core.host.ArcState
import arcs.core.host.DeserializedException
import arcs.core.host.HandleManagerImpl
import arcs.core.host.HelloHelloPlan
import arcs.core.host.HostRegistry
import arcs.core.host.MultiplePersonPlan
import arcs.core.host.NonRelevant
import arcs.core.host.ParticleNotFoundException
import arcs.core.host.ParticleRegistration
import arcs.core.host.ParticleState
import arcs.core.host.PersonPlan
import arcs.core.host.ReadPerson
import arcs.core.host.ReadPerson2
import arcs.core.host.ReadPerson_Person
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.host.TestingHost
import arcs.core.host.TestingJvmProdHost
import arcs.core.host.WritePerson
import arcs.core.host.WritePerson2
import arcs.core.host.api.HandleHolder
import arcs.core.host.api.Particle
import arcs.core.host.toRegistration
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.core.testutil.fail
import arcs.core.util.Log
import arcs.core.util.plus
import arcs.core.util.testutil.LogRule
import arcs.core.util.traverse
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.util.testutil.FakeTime
import arcs.sdk.HandleHolderBase
import com.google.common.truth.Truth.assertThat
import java.time.LocalDateTime
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.test.assertFailsWith
import kotlin.random.Random
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
open class AllocatorTestBase {
  @get:Rule
  val log = LogRule(Log.Level.Warning)

  private val schedulerProvider = SimpleSchedulerProvider(Dispatchers.Default)
  private lateinit var scope: CoroutineScope

  protected lateinit var allocator: Allocator
  private lateinit var hostRegistry: HostRegistry
  private lateinit var writePersonParticle: Plan.Particle
  private lateinit var readPersonParticle: Plan.Particle

  protected val personSchema = ReadPerson_Person.SCHEMA

  private lateinit var readingExternalHost: TestingHost
  private lateinit var writingExternalHost: TestingHost
  private lateinit var pureHost: TestingJvmProdHost

  private class WritingHost : TestingHost(
    SimpleSchedulerProvider(EmptyCoroutineContext),
    testStorageEndpointManager(),
    ::WritePerson.toRegistration(),
    ::WritePerson2.toRegistration()
  )

  private class ReadingHost : TestingHost(
    SimpleSchedulerProvider(EmptyCoroutineContext),
    testStorageEndpointManager(),
    ::ReadPerson.toRegistration(),
    ::ReadPerson2.toRegistration()
  )

  /** Return the [ArcHost] that contains [ReadPerson]. */
  open fun readingHost(): TestingHost = ReadingHost()

  /** Return the [ArcHost] that contains [WritePerson]. */
  open fun writingHost(): TestingHost = WritingHost()

  /** Return the [ArcHost] that contains all isolatable [Particle]s. */
  open fun pureHost() = TestingJvmProdHost(schedulerProvider, testStorageEndpointManager())

  open val storageCapability = Capabilities(Shareable(true))

  open fun runAllocatorTest(
    testBody: suspend CoroutineScope.() -> Unit
  ) = runBlocking {
    testBody()
  }

  open fun runFuzzTest(
    testBody: suspend CoroutineScope.(s: Seed) -> Unit
  ) = runBlocking {
    val s = DateSeededRandom()
    try {
      testBody(s)
    } catch (e: Throwable) {
      s.printSeed()
      throw e
    }
  }

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
    DriverAndKeyConfigurator.configure(null)

    readingExternalHost = readingHost()
    writingExternalHost = writingHost()
    pureHost = pureHost()

    hostRegistry = hostRegistry()
    scope = CoroutineScope(Dispatchers.Default)
    allocator = Allocator.create(
      hostRegistry,
      HandleManagerImpl(
        time = FakeTime(),
        scheduler = schedulerProvider("allocator"),
        storageEndpointManager = testStorageEndpointManager(),
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
      ),
      scope
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
    arc: Arc,
    arcState: ArcState
  ) {
    check(arc.partitions.isNotEmpty()) { "No partitions for ${arc.id}" }
    arc.partitions.forEach { partition ->
      val hostId = partition.arcHost
      val status = when {
        hostId.contains("${readingExternalHost.hashCode()}") ->
          readingExternalHost.lookupArcHostStatus(partition)
        hostId.contains("${pureHost.hashCode()}") ->
          pureHost.lookupArcHostStatus(partition)
        hostId.contains("${writingExternalHost.hashCode()}") ->
          writingExternalHost.lookupArcHostStatus(partition)
        else -> throw IllegalArgumentException("Unknown ${partition.arcHost}")
      }
      assertThat(status).isEqualTo(arcState)
    }
  }

  open fun allocator(hostRegistry: HostRegistry): Allocator {
    return Allocator.create(
      hostRegistry,
      EntityHandleManager(
        time = FakeTime(),
        scheduler = schedulerProvider("allocator"),
        storageEndpointManager = testStorageEndpointManager(),
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
      ),
      CoroutineScope(Dispatchers.Default)
    )
  }

  interface A<T> {
    operator fun invoke(): T
  }

  interface T<I, O> {
    operator fun invoke(i: I): O
  }

  interface Seed {
    fun nextDouble(): Double
    fun nextLessThan(max: Int): Int
    fun nextInRange(min: Int, max: Int): Int
  }

  open class SeededRandom(val seed: Int): Seed {
    val random = Random(seed)
    override fun nextDouble(): Double = random.nextDouble()
    override fun nextLessThan(max: Int): Int = random.nextInt(0, max - 1)
    override fun nextInRange(min: Int, max: Int): Int = random.nextInt(min, max)
    fun printSeed() {
      println("Seed was $seed")
    }
  }

  class DateSeededRandom: SeededRandom(LocalDateTime.now().hashCode()) {
  }

  class Value<T>(val value: T): A<T> {
    override operator fun invoke(): T = value
  }

  class ChooseFromList<T>(val s: Seed, val values: List<T>) : A<T> {
    override operator fun invoke(): T {
      return this.values[this.s.nextLessThan(this.values.size)]
    }
  }

  class PlanParticleGenerator(val name: A<String>, val location: A<String>) : A<Plan.Particle> {
    override operator fun invoke(): Plan.Particle {
      return Plan.Particle(this.name(), this.location(), emptyMap())
    }
  }

  class PlanFromParticles(val s: Seed): T<List<Plan.Particle>, Plan>  {
    override operator fun invoke(particles: List<Plan.Particle>): Plan {
      return Plan(
        particles.toList(),
        emptyList(),
        emptyList()
      )
    }
  }
  
  class HostRegistryFromParticles(val s: Seed): T<List<ParticleRegistration>, HostRegistry> {
    override operator fun invoke(particles: List<ParticleRegistration>): HostRegistry {
      assert(particles.size > 0)
      val numHosts = this.s.nextInRange(1, particles.size)
      val particleMappings = (1..numHosts).map { mutableListOf<ParticleRegistration>() }
      particles.forEach { particleMappings[this.s.nextLessThan(numHosts)].add(it) }
      val registry = ExplicitHostRegistry()
      particleMappings.map { 
        TestingHost(
          SimpleSchedulerProvider(EmptyCoroutineContext),
          testStorageEndpointManager(),
          *(it.toTypedArray())
        )
      }.forEach { runBlocking { registry.registerHost(it) } }
      return registry
    }
  }
 
  class ParticleRegistrationGenerator(val s: Seed, val name: A<String>): A<ParticleRegistration> {
    override operator fun invoke(): ParticleRegistration {
      class SpecialParticle: Particle {
        override val handles: HandleHolder = HandleHolderBase(this@ParticleRegistrationGenerator.name(), emptyMap())
      }
      return ::SpecialParticle.toRegistration()
    }
  }

  /**
   * An Allocator takes a Plan and a mapping of Particles to ArcHosts, then partitions
   * the plan across ArcHosts.
   *
   * What are some invariants?
   * - a plan with unmapped particles will generate an error.
   * - a plan that only references mapped particles will resolve
   * - a particle will never be in more than one partition.
   * - every particle will end up in a partition.
   */

  suspend fun invariant_addUnmappedParticle_generatesError(plan: A<Plan>, hostRegistry: A<HostRegistry>, extraParticle: A<Plan.Particle>) {
    val allocator = allocator(hostRegistry());
    val modifiedPlan = Plan.particleLens.mod(plan()) { val list = it.toMutableList(); list.add(extraParticle()); list }
    assertSuspendingThrows(ParticleNotFoundException::class) {
      allocator.startArcForPlan(modifiedPlan)
    }
  }

  suspend fun invariant_planWithOnly_mappedParticles_willResolve(
    particles: A<List<ParticleRegistration>>,
    plan: T<List<Plan.Particle>, Plan>,
    hostRegistry: T<List<ParticleRegistration>, HostRegistry>
  ) {
    val theParticles = particles()
    val planParticles = theParticles.map { Plan.Particle(it.first.id, it.first.id, emptyMap()) }
    val allocator = allocator(hostRegistry(theParticles))
    allocator.startArcForPlan(plan(planParticles))
  }

  @Test
  open fun fuzz_addUnmappedParticle_generatesError() = runFuzzTest {
    val particle = PlanParticleGenerator(
      ChooseFromList(it, listOf("Particle", "Shmarticle", "Blarticle")),
      ChooseFromList(it, listOf("location.one", "a.location.two", "the.location.three"))
    )
    invariant_addUnmappedParticle_generatesError(Value(PersonPlan), Value(hostRegistry), particle)
  }


  /**
   * Tests that the Recipe is properly partitioned so that [ReadingHost] contains only
   * [ReadPerson] with associated handles and connections, and [WritingHost] contains only
   * [WritePerson] with associated handles and connections.
   */
  @Test
  open fun allocator_computePartitions() = runAllocatorTest {
    val arc = allocator.startArcForPlan(PersonPlan).waitForStart()

    val readingHost = requireNotNull(
      hostRegistry.availableArcHosts().first {
        it.hostId.equals("${readingExternalHost.hashCode()}")
      }
    )

    val writingHost = requireNotNull(
      hostRegistry.availableArcHosts().first {
        it.hostId.equals("${writingExternalHost.hashCode()}")
      }
    )

    val prodHost = requireNotNull(
      hostRegistry.availableArcHosts().first {
        it.hostId.equals("${pureHost.hashCode()}")
      }
    )

    val allStorageKeyLens =
      Plan.Particle.handlesLens.traverse() + Plan.HandleConnection.handleLens +
        Plan.Handle.storageKeyLens

    // fetch the allocator replaced key
    val readPersonKey = findPartitionFor(
      arc.partitions, "ReadPerson"
    ).particles[0].handles["person"]?.storageKey!!

    val writePersonKey = findPartitionFor(
      arc.partitions, "WritePerson"
    ).particles[0].handles["person"]?.storageKey!!

    val purePartition = findPartitionFor(arc.partitions, "PurePerson")

    val storageKeyLens = Plan.HandleConnection.handleLens + Plan.Handle.storageKeyLens

    assertThat(arc.partitions).containsExactly(
      Plan.Partition(
        arc.id.toString(),
        readingHost.hostId,
        // replace the CreatableKeys with the allocated keys
        listOf(allStorageKeyLens.mod(readPersonParticle) { readPersonKey })
      ),
      Plan.Partition(
        arc.id.toString(),
        prodHost.hostId,
        // replace the CreatableKeys with the allocated keys
        listOf(
          Plan.Particle.handlesLens.mod(purePartition.particles[0]) {
            mapOf(
              "inputPerson" to storageKeyLens.mod(it["inputPerson"]!!) { writePersonKey },
              "outputPerson" to storageKeyLens.mod(it["outputPerson"]!!) { readPersonKey }
            )
          }
        )
      ),
      Plan.Partition(
        arc.id.toString(),
        writingHost.hostId,
        // replace the CreatableKeys with the allocated keys
        listOf(allStorageKeyLens.mod(writePersonParticle) { writePersonKey })
      )
    )
  }

  @Test
  open fun allocator_verifyStorageKeysCreated() = runAllocatorTest {
    PersonPlan.particles.forEach {
      it.handles.forEach { (_, connection) ->
        assertThat(connection.storageKey).isInstanceOf(CreatableStorageKey::class.java)
      }
    }
    log("Plan handles are using correct storage keys")
    val arc = allocator.startArcForPlan(PersonPlan).waitForStart()

    log("Arc started.")
    arc.partitions.flatMap { it.particles }.forEach { particle ->
      particle.handles.forEach { (_, connection) ->
        assertThat(connection.storageKey).isNotInstanceOf(
          CreatableStorageKey::class.java
        )
      }
    }
    log("Particle handles are using correct storage key types")
    val readPartition = findPartitionFor(arc.partitions, "ReadPerson")
    val purePartition = findPartitionFor(arc.partitions, "PurePerson")
    val writePartition = findPartitionFor(arc.partitions, "WritePerson")

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

    val resolver = CapabilitiesResolver(CapabilitiesResolver.Options(testArcId))
    val inputPerson = resolver.createStorageKey(
      Capabilities.fromAnnotation(Annotation.createCapability("tiedToArc")),
      EntityType(personSchema),
      "inputPerson"
    )
    val outputPerson = resolver.createStorageKey(
      Capabilities.fromAnnotation(Annotation.createCapability("tiedToArc")),
      EntityType(personSchema),
      "outputPerson"
    )

    val allStorageKeyLens =
      Plan.particleLens.traverse() + Plan.Particle.handlesLens.traverse() +
        Plan.HandleConnection.handleLens + Plan.Handle.storageKeyLens

    val testPlan = allStorageKeyLens.mod(PersonPlan) { storageKey ->
      storageKey as CreatableStorageKey
      when (storageKey.nameFromManifest) {
        "inputPerson" -> inputPerson
        "outputPerson" -> outputPerson
        else -> storageKey
      }
    }

    val arc = allocator.startArcForPlan(testPlan).waitForStart()

    val testKeys = listOf(inputPerson, outputPerson)

    arc.partitions.flatMap { it.particles }.forEach { particle ->
      particle.handles.forEach { (_, connection) ->
        assertThat(connection.storageKey).isIn(testKeys)
      }
    }
  }

  @Test
  open fun allocator_verifyArcHostStartCalled() = runAllocatorTest {
    val arc = allocator.startArcForPlan(PersonPlan).waitForStart()

    val readingHost = requireNotNull(
      hostRegistry.availableArcHosts().first {
        it.hostId.equals("${readingExternalHost.hashCode()}")
      }
    )

    val writingHost = requireNotNull(
      hostRegistry.availableArcHosts().first {
        it.hostId.equals("${writingExternalHost.hashCode()}")
      }
    )

    val prodHost = requireNotNull(
      hostRegistry.availableArcHosts().first {
        it.hostId.equals("${pureHost.hashCode()}")
      }
    )

    arc.partitions.forEach {
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
  fun allocator_verifyAdditionalUnknownParticleThrows() = runAllocatorTest {
    val particle = Plan.Particle(
      particleName = "Unknown Particle",
      location = "unknown.Particle",
      handles = emptyMap()
    )

    invariant_addUnmappedParticle_generatesError(Value(PersonPlan), Value(hostRegistry), Value(particle))
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
    assertFailsWith<ParticleNotFoundException> {
      allocator.startArcForPlan(plan).waitForStart()
    }
  }

  private fun particleToContext(context: ArcHostContext, particle: Plan.Particle) =
    context.particles.first {
      it.planParticle.particleName == particle.particleName
    }

  @Test
  open fun allocator_canRunArcWithSameParticleTwice() = runAllocatorTest {
    val arc = allocator.startArcForPlan(HelloHelloPlan)
    val arcId = arc.id

    arc.waitForStart()

    val readingContext = requireNotNull(
      readingExternalHost.arcHostContext(arcId.toString())
    )
    val writingContext = requireNotNull(
      writingExternalHost.arcHostContext(arcId.toString())
    )

    val readPersonContext = particleToContext(readingContext, readPersonParticle)

    val writePersonContext = particleToContext(writingContext, writePersonParticle)

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
      assertThat(particle.name).isEqualTo("Hello Hello John Wick")
    }
  }

  @Test
  open fun allocator_canRunWithTwoParticlesPerHost() = runAllocatorTest {
    val arc = allocator.startArcForPlan(MultiplePersonPlan)
    val arcId = arc.id

    arc.waitForStart()

    val readingContext = requireNotNull(
      readingExternalHost.arcHostContext(arcId.toString())
    )
    val writingContext = requireNotNull(
      writingExternalHost.arcHostContext(arcId.toString())
    )

    val readingContext2 = requireNotNull(
      readingExternalHost.arcHostContext(arcId.toString())
    )
    val writingContext2 = requireNotNull(
      writingExternalHost.arcHostContext(arcId.toString())
    )

    val readPersonContext = particleToContext(readingContext, readPersonParticle)
    val readPersonContext2 = particleToContext(readingContext2, readPersonParticle)

    val writePersonContext = particleToContext(writingContext, writePersonParticle)
    val writePersonContext2 = particleToContext(writingContext2, writePersonParticle)

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

    writePersonContext2.particle.let { particle ->
      particle as WritePerson
      particle.await()
      assertThat(particle.firstStartCalled).isTrue()
      assertThat(particle.wrote).isTrue()
    }

    readPersonContext2.particle.let { particle ->
      particle as ReadPerson
      particle.await()
      assertThat(particle.firstStartCalled).isTrue()
      assertThat(particle.name).isEqualTo("Hello John Wick")
    }
  }

  @Test
  open fun allocator_canStartArcInTwoExternalHosts() = allocator_canStartArcInTwoExternalHostsImpl()

  @Test
  open fun allocator_withNonReleventParticle_canStartArcInTwoExternalHosts() =
    allocator_canStartArcInTwoExternalHostsImpl(true)

  /** nonRelevent = true causes an extra unused particle to be added to the reading ArcHost */
  fun allocator_canStartArcInTwoExternalHostsImpl(nonRelevent: Boolean = false) = runAllocatorTest {
    if (nonRelevent) {
      val registration = ::NonRelevant.toRegistration()
      readingExternalHost.registerTestParticle(registration.first, registration.second)
    }

    val arc = allocator.startArcForPlan(PersonPlan)
    val arcId = arc.id

    arc.waitForStart()

    assertThat(readingExternalHost.started.size).isEqualTo(1)
    assertThat(writingExternalHost.started.size).isEqualTo(1)

    assertThat(arc.partitions).contains(
      readingExternalHost.started.first()
    )
    assertThat(arc.partitions).contains(
      writingExternalHost.started.first()
    )

    val readingContext = requireNotNull(
      readingExternalHost.arcHostContext(arcId.toString())
    )
    val writingContext = requireNotNull(
      writingExternalHost.arcHostContext(arcId.toString())
    )

    assertAllStatus(arc, ArcState.Running)

    val readPersonContext = particleToContext(readingContext, readPersonParticle)

    val writePersonContext = particleToContext(writingContext, writePersonParticle)

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
    val arc = allocator.startArcForPlan(PersonPlan).waitForStart()

    val readingContext = requireNotNull(
      readingExternalHost.arcHostContext(arc.id.toString())
    )
    val writingContext = requireNotNull(
      writingExternalHost.arcHostContext(arc.id.toString())
    )

    assertAllStatus(arc, ArcState.Running)

    arc.stop()
    arc.waitForStop()

    assertAllStatus(arc, ArcState.Stopped)

    val readPersonContext = particleToContext(readingContext, readPersonParticle)

    val writePersonContext = particleToContext(writingContext, writePersonParticle)

    assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Stopped)
    assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Stopped)

    assertThat((writePersonContext.particle as WritePerson).shutdownCalled).isTrue()
    assertThat((readPersonContext.particle as ReadPerson).shutdownCalled).isTrue()

    assertThat(readingExternalHost.isIdle()).isTrue()
    assertThat(writingExternalHost.isIdle()).isTrue()
  }

  @Test
  open fun allocator_restartArcInTwoExternalHosts() = runAllocatorTest {
    val arc = allocator.startArcForPlan(PersonPlan)
    val arcId = arc.waitForStart().id

    assertAllStatus(arc, ArcState.Running)

    arc.stop()
    arc.waitForStop()

    assertAllStatus(arc, ArcState.Stopped)

    readingExternalHost.clearCache()
    writingExternalHost.clearCache()
    pureHost.clearCache()

    val arc2 = allocator.startArcForPlan(
      Plan(
        PersonPlan.particles,
        PersonPlan.handles,
        listOf(Annotation.createArcId(arcId.toString()))
      )
    )
    arc2.waitForStart()

    val readingContextAfter = requireNotNull(
      readingExternalHost.arcHostContext(arcId.toString())
    )
    val writingContextAfter = requireNotNull(
      writingExternalHost.arcHostContext(arcId.toString())
    )

    assertAllStatus(arc, ArcState.Running)

    val readPersonContext = particleToContext(readingContextAfter, readPersonParticle)

    val writePersonContext = particleToContext(writingContextAfter, writePersonParticle)

    assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Running)
    assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Running)

    // onFirstStart() not called a second time
    assertThat((writePersonContext.particle as WritePerson).firstStartCalled).isFalse()
    assertThat((readPersonContext.particle as ReadPerson).firstStartCalled).isFalse()
  }

  @Test
  open fun allocator_startFromOneAllocatorAndStopInAnother() = runAllocatorTest {
    val arc = allocator.startArcForPlan(PersonPlan).waitForStart()

    val readingContext = requireNotNull(
      readingExternalHost.arcHostContext(arc.id.toString())
    )
    val writingContext = requireNotNull(
      writingExternalHost.arcHostContext(arc.id.toString())
    )

    assertAllStatus(arc, ArcState.Running)

    val allocator2 = Allocator.create(
      hostRegistry,
      HandleManagerImpl(
        time = FakeTime(),
        scheduler = schedulerProvider("allocator2"),
        storageEndpointManager = testStorageEndpointManager(),
        foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
      ),
      scope
    )

    allocator2.stopArc(arc.id)
    arc.waitForStop()

    assertThat(readingContext.arcState).isEqualTo(ArcState.Stopped)
    assertThat(writingContext.arcState).isEqualTo(ArcState.Stopped)
  }

  @Test
  open fun allocator_doesntCreateArcsOnDuplicateStartArc() = runAllocatorTest {
    val arc = allocator.startArcForPlan(PersonPlan).waitForStart()

    assertAllStatus(arc, ArcState.Running)

    readingExternalHost.stopArc(readingExternalHost.started.first())
    pureHost.stopArc(pureHost.started.first())
    writingExternalHost.stopArc(writingExternalHost.started.first())

    arc.waitForStop()
    assertAllStatus(arc, ArcState.Stopped)

    // This erases the internally held-in-memory-cache ArcHost state simulating a crash
    readingExternalHost.setup()
    pureHost.setup()
    writingExternalHost.setup()

    val arc2 = allocator.startArcForPlan(
      Plan(
        PersonPlan.particles,
        PersonPlan.handles,
        listOf(Annotation.createArcId(arc.id.toString()))
      )
    )

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

    val arcState = writingExternalHost.arcHostContext(arc.id.toString())!!.arcState
    assertThat(arcState).isEqualTo(ArcState.Error)
    arcState.cause.let {
      assertThat(it).isInstanceOf(IllegalArgumentException::class.java)
      assertThat(it).hasMessageThat().isEqualTo("Boom!")
    }
  }

  @Test
  open fun allocator_startArc_particleException_failsWaitForStart() = runAllocatorTest {
    WritePerson.throws = true
    val arc = allocator.startArcForPlan(PersonPlan)

    val error = assertFailsWith<Arc.ArcErrorException> {
      arc.waitForStart()
    }
    // TODO(b//160933123): the containing exception is somehow "duplicated",
    //                     so the real cause is a second level down
    val cause = error.cause!!.cause
    when (cause) {
      // For CoreAllocatorTest
      is IllegalArgumentException -> assertThat(cause.message).isEqualTo("Boom!")
      // For AndroidAllocatorTest
      is DeserializedException ->
        assertThat(cause.message).isEqualTo("java.lang.IllegalArgumentException: Boom!")
      else -> fail("Expected IllegalArgumentException or DeserializedException; got $cause")
    }
  }
}
