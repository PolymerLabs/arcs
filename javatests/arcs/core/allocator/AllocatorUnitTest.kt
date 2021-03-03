/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.allocator

import arcs.core.common.ArcId
import arcs.core.common.Id
import arcs.core.common.toArcId
import arcs.core.data.Annotation
import arcs.core.data.Capabilities
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.data.ReferenceType
import arcs.core.data.SchemaRegistry
import arcs.core.data.SingletonType
import arcs.core.data.builder.handle
import arcs.core.data.builder.particle
import arcs.core.data.builder.plan
import arcs.core.data.builder.schema
import arcs.core.host.ArcHost
import arcs.core.host.ArcHostException
import arcs.core.host.ArcHostNotFoundException
import arcs.core.host.ArcState
import arcs.core.host.ArcStateChangeCallback
import arcs.core.host.ArcStateChangeRegistration
import arcs.core.host.HostRegistry
import arcs.core.host.ParticleIdentifier
import arcs.core.host.ParticleNotFoundException
import arcs.core.storage.CapabilitiesResolver
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.util.Log
import arcs.core.util.TaggedLog
import arcs.core.util.plus
import arcs.core.util.testutil.LogRule
import arcs.core.util.traverse
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@ExperimentalCoroutinesApi
@RunWith(JUnit4::class)
class AllocatorUnitTest {
  private lateinit var scope: TestCoroutineScope
  private lateinit var hostRegistry: FakeHostRegistry
  private lateinit var partitionMap: FakePartitionSerialization
  private lateinit var allocator: Allocator

  @get:Rule
  val log = LogRule(Log.Level.Warning)

  @Before
  fun setUp() {
    DriverAndKeyConfigurator.configure(null)
    scope = TestCoroutineScope()
    hostRegistry = FakeHostRegistry()
    partitionMap = FakePartitionSerialization()
    allocator = Allocator(hostRegistry, partitionMap, scope)
  }

  @After
  fun tearDown() {
    scope.cleanupTestCoroutines()
    SchemaRegistry.clearForTest()
  }

  @Test
  fun startArcForPlan_populatesSchemaRegistry() = scope.runBlockingTest {
    val schema1 = schema("abcdef")
    val schema2 = schema("ghijkl")
    val schema3 = schema("mnopqr")
    val plan = plan {
      handle(DummyStorageKey("handle1")) {
        type = CollectionType(EntityType(schema1))
      }
      handle(DummyStorageKey("handle2")) {
        type = SingletonType(EntityType(schema2))
      }
      handle(DummyStorageKey("handle3")) {
        type = SingletonType(ReferenceType(EntityType(schema3)))
      }
    }

    allocator.startArcForPlan(plan)

    assertThat(SchemaRegistry.getSchema("abcdef")).isEqualTo(schema1)
    assertThat(SchemaRegistry.getSchema("ghijkl")).isEqualTo(schema2)
    assertThat(SchemaRegistry.getSchema("mnopqr")).isEqualTo(schema3)
  }

  @Test
  fun startArcForPlan_withExistingPartitions_returnsValidArc() = scope.runBlockingTest {
    val arcIdStr = "myArc"
    partitionMap.set(
      listOf(
        Plan.Partition(arcIdStr, "hostOne", emptyList()),
        Plan.Partition(arcIdStr, "hostTwo", emptyList()),
        Plan.Partition(arcIdStr, "hostThree", emptyList())
      )
    )

    val plan = plan { arcId = arcIdStr }

    val arc = allocator.startArcForPlan(plan)

    assertThat(arc.id).isEqualTo(arcIdStr.toArcId())
    assertThat(arc.partitions).containsExactly(
      Plan.Partition(arcIdStr, "hostOne", emptyList()),
      Plan.Partition(arcIdStr, "hostTwo", emptyList()),
      Plan.Partition(arcIdStr, "hostThree", emptyList())
    )
  }

  @Test
  fun startArcForPlan_noExistingPartitions_withArcId() = scope.runBlockingTest {
    val host1 = FakeArcHost("Host1", listOf(PARTICLE1, PARTICLE2))
    val host2 = FakeArcHost("Host2", listOf(PARTICLE3))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val partitions = listOf(
      Plan.Partition("!:myArc", "Host1", listOf(PARTICLE1, PARTICLE2)),
      Plan.Partition("!:myArc", "Host2", listOf(PARTICLE3))
    )
    val plan = plan {
      arcId = "myArc"

      add(PARTICLE1)
      add(PARTICLE2)
      add(PARTICLE3)
    }

    val arc = allocator.startArcForPlan(plan)

    assertThat(arc.id).isEqualTo("myArc".toArcId())
    assertThat(arc.partitions).hasSize(2)
    val actualHost1Partition = arc.partitions.find { it.arcHost == "Host1" }
    assertThat(actualHost1Partition!!.particles).isEqualTo(partitions[0].particles)
    val actualHost2Partition = arc.partitions.find { it.arcHost == "Host2" }
    assertThat(actualHost2Partition!!.particles).isEqualTo(partitions[1].particles)
    assertThat(partitionMap.setPartitionsCallValue).isEqualTo(arc.partitions)
  }

  @Test
  fun startArcForPlan_noExistingPartitions_withArcIdForTesting() = scope.runBlockingTest {
    val host1 = FakeArcHost("Host1", listOf(PARTICLE1, PARTICLE2))
    val host2 = FakeArcHost("Host2", listOf(PARTICLE3))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val partitions = listOf(
      Plan.Partition("!:arc", "Host1", listOf(PARTICLE1, PARTICLE2)),
      Plan.Partition("!:arc", "Host2", listOf(PARTICLE3))
    )
    val plan = plan {
      add(PARTICLE1)
      add(PARTICLE2)
      add(PARTICLE3)
    }

    val arc = allocator.startArcForPlan(plan)

    assertThat(arc.id.idTreeString).isEqualTo("arc")
    assertThat(arc.partitions).hasSize(2)
    val actualHost1Partition = arc.partitions.find { it.arcHost == "Host1" }
    assertThat(actualHost1Partition!!.particles).isEqualTo(partitions[0].particles)
    val actualHost2Partition = arc.partitions.find { it.arcHost == "Host2" }
    assertThat(actualHost2Partition!!.particles).isEqualTo(partitions[1].particles)
    assertThat(partitionMap.setPartitionsCallValue).isEqualTo(arc.partitions)
  }

  @Test
  fun startArcForPlan_noExistingPartitionsNoAvailableHosts() = scope.runBlockingTest {
    val plan = plan {
      add(PARTICLE1)
      add(PARTICLE2)
    }
    val host1 = FakeArcHost("Host1", listOf(PARTICLE1))
    hostRegistry.registerHost(host1)

    assertFailsWith<ParticleNotFoundException> { allocator.startArcForPlan(plan) }
  }

  @Test
  fun startArcForPlan_whenHostThrows_reThrowsAndStops() = scope.runBlockingTest {
    val host1 = FakeArcHost("HostOne", listOf(PARTICLE1))
    host1.throwExceptionOnStart = true
    val host2 = FakeArcHost("HostTwo", listOf(PARTICLE2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val plan = plan {
      add(PARTICLE1)
      add(PARTICLE2)
    }

    assertFailsWith<ArcHostException> { allocator.startArcForPlan(plan) }

    // Check that both hosts have been asked to stop the arc.
    assertThat(host1.stopArcPartition).isNotNull()
    assertThat(host2.stopArcPartition).isNotNull()
  }

  @Test
  fun stopArc_clearsPartitionsFromPartitionSerialization() = scope.runBlockingTest {
    val host1 = FakeArcHost("HostOne", listOf(PARTICLE1))
    val host2 = FakeArcHost("HostTwo", listOf(PARTICLE2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    partitionMap.set(
      listOf(
        Plan.Partition("!:myArc", "HostOne", listOf(PARTICLE1)),
        Plan.Partition("!:myArc", "HostTwo", listOf(PARTICLE2))
      )
    )

    allocator.stopArc("myArc".toArcId())

    assertThat(partitionMap.readAndClearPartitionsArcId).isEqualTo("myArc".toArcId())
    assertThat(host1.stopArcPartition).isEqualTo(
      Plan.Partition("!:myArc", "HostOne", listOf(PARTICLE1))
    )
    assertThat(host2.stopArcPartition).isEqualTo(
      Plan.Partition("!:myArc", "HostTwo", listOf(PARTICLE2))
    )
  }

  @Test
  fun lookupArcHost_throwsWhenNotFound() = scope.runBlockingTest {
    assertFailsWith<ArcHostNotFoundException> {
      allocator.lookupArcHost(arcHost = "Definitely not registered")
    }
  }

  @Test
  fun lookupArcHost_returnsHostIfFound() = scope.runBlockingTest {
    val host = FakeArcHost("myArcHost", emptyList())
    hostRegistry.registerHost(host)

    assertThat(allocator.lookupArcHost("myArcHost")).isEqualTo(host)
  }

  @Test
  fun findArcHostByParticle_throwsWhenNotFound() = scope.runBlockingTest {
    assertFailsWith<ParticleNotFoundException> { allocator.findArcHostByParticle(PARTICLE1) }
  }

  @Test
  fun findArcHostByParticle_findsSupportingHost() = scope.runBlockingTest {
    val host1 = FakeArcHost("Host1", listOf(PARTICLE1))
    val host2 = FakeArcHost("Host2", listOf(PARTICLE2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)

    assertThat(allocator.findArcHostByParticle(PARTICLE1)).isEqualTo(host1)
    assertThat(allocator.findArcHostByParticle(PARTICLE2)).isEqualTo(host2)
  }

  @Test
  fun createNonSerializing_exercise() = scope.runBlockingTest {
    val allocator = Allocator.createNonSerializing(hostRegistry, scope)

    val host1 = FakeArcHost("HostOne", listOf(PARTICLE1))
    val host2 = FakeArcHost("HostTwo", listOf(PARTICLE2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val plan = plan {
      add(PARTICLE1)
      add(PARTICLE2)
    }

    val arc = allocator.startArcForPlan(plan)
    allocator.stopArc(arc.id)
  }

  /**
   * Test that adding an unmapped particle to a plan results in that plan being unable to be
   * started.
   */
  @Test
  fun verifyAdditionalUnknownParticleThrows() = scope.runBlockingTest {
    val unknownParticle = Plan.Particle(
      particleName = "Unknown Particle",
      location = "unknown.Particle",
      handles = emptyMap()
    )

    val host1 = FakeArcHost("HostOne", listOf(PARTICLE1))
    val host2 = FakeArcHost("HostTwo", listOf(PARTICLE2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val plan = plan {
      add(PARTICLE1)
      add(PARTICLE2)
    }

    invariant_addUnmappedParticle_generatesError(plan, hostRegistry, unknownParticle)
  }

  /**
   * Test that PersonPlan can be started with a hostRegistry established for this purpose.
   */
  @Test
  fun startArcForPlan_canPartitionArcInExternalHosts() = runBlocking {
    val host1 = FakeArcHost("HostOne", listOf(PARTICLE1))
    val host2 = FakeArcHost("HostTwo", listOf(PARTICLE2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val plan = plan {
      add(PARTICLE1)
      add(PARTICLE2)
    }

    invariant_planWithOnly_mappedParticles_willResolve(plan, hostRegistry)
  }

  /**
   * Tests that the Recipe is properly partitioned so that [ReadingHost] contains only
   * [ReadPerson] with associated handles and connections, and [WritingHost] contains only
   * [WritePerson] with associated handles and connections.
   */
  @Test
  fun startArcForPlan_computesPartitions(): Unit = scope.runBlockingTest {
    val readingHost = FakeArcHost("ReadingHost", listOf(READ_PARTICLE))
    val writingHost = FakeArcHost("WritingHost", listOf(WRITE_PARTICLE))
    val pureHost = FakeArcHost("PureHost", listOf(PURE_PARTICLE))
    hostRegistry.registerHost(readingHost)
    hostRegistry.registerHost(writingHost)
    hostRegistry.registerHost(pureHost)

    val arc = allocator.startArcForPlan(PLAN)

    val allStorageKeyLens = Plan.Particle.handlesLens.traverse() +
      Plan.HandleConnection.handleLens +
      Plan.Handle.storageKeyLens

    // fetch the allocator replaced key
    val readPersonKey = findPartitionFor(
      arc.partitions, "ReadParticle"
    ).particles[0].handles["person"]?.storageKey!!

    val writePersonKey = findPartitionFor(
      arc.partitions, "WriteParticle"
    ).particles[0].handles["person"]?.storageKey!!

    val purePartition = findPartitionFor(arc.partitions, "PureParticle")

    val storageKeyLens = Plan.HandleConnection.handleLens + Plan.Handle.storageKeyLens

    assertThat(arc.partitions).containsExactly(
      Plan.Partition(
        arc.id.toString(),
        readingHost.hostId,
        // replace the CreatableKeys with the allocated keys
        listOf(allStorageKeyLens.mod(READ_PARTICLE) { readPersonKey })
      ),
      Plan.Partition(
        arc.id.toString(),
        writingHost.hostId,
        // replace the CreatableKeys with the allocated keys
        listOf(allStorageKeyLens.mod(WRITE_PARTICLE) { writePersonKey })
      ),
      Plan.Partition(
        arc.id.toString(),
        pureHost.hostId,
        // replace the CreatableKeys with the allocated keys
        listOf(
          Plan.Particle.handlesLens.mod(purePartition.particles[0]) {
            mapOf(
              "inputPerson" to storageKeyLens.mod(it["inputPerson"]!!) { readPersonKey },
              "outputPerson" to storageKeyLens.mod(it["outputPerson"]!!) { writePersonKey }
            )
          }
        )
      )
    )
    allocator.stopArc(arc.id)
  }

  @Test
  fun startArcForPlan_createsStorageKeys() = scope.runBlockingTest {
    val readingHost = FakeArcHost("ReadingHost", listOf(READ_PARTICLE))
    hostRegistry.registerHost(readingHost)
    val plan = plan {
      add(PERSON_INPUT_HANDLE)
      add(READ_PARTICLE)
    }
    val fakeStorageKeyCreator = FakeStorageKeyCreator()
    allocator = Allocator(hostRegistry, partitionMap, scope, fakeStorageKeyCreator)
    allocator.startArcForPlan(plan)

    assertThat(fakeStorageKeyCreator.createdStorageKeys).isTrue()
  }

  @Test
  fun startArcForPlan_verifyStorageKeysNotOverwritten() = scope.runBlockingTest {
    val idGenerator = Id.Generator.newSession()
    val testArcId = idGenerator.newArcId("Test")

    val resolver = CapabilitiesResolver(CapabilitiesResolver.Options(testArcId))
    val inputPerson = resolver.createStorageKey(
      Capabilities.fromAnnotation(Annotation.createCapability("tiedToArc")),
      EntityType(PERSON_SCHEMA),
      "inputParticle"
    )
    val outputPerson = resolver.createStorageKey(
      Capabilities.fromAnnotation(Annotation.createCapability("tiedToArc")),
      EntityType(PERSON_SCHEMA),
      "outputParticle"
    )
    val newInputHandle = PERSON_INPUT_HANDLE.copy(storageKey = inputPerson)
    val newOutputHandle = PERSON_OUTPUT_HANDLE.copy(storageKey = outputPerson)

    val handleLens = Plan.particleLens.traverse() +
      Plan.Particle.handlesLens.traverse() +
      Plan.HandleConnection.handleLens

    val updatedPlan = handleLens.mod(PLAN) { handle ->
      val key = handle.storageKey as DummyStorageKey
      when(key.key) {
        "create://personInputHandle" -> newInputHandle
        "create://personOutputHandle" -> newOutputHandle
        else -> handle
      }
    }.copy(handles = listOf(newInputHandle, newOutputHandle))

    val readingHost = FakeArcHost(
      "ReadingHost",
      listOf(updatedPlan.particles.find { it.location.contains("ReadParticle") }!!)
    )
    val writingHost = FakeArcHost(
      "WritingHost",
      listOf(updatedPlan.particles.find { it.location.contains("WriteParticle") }!!)
    )
    val pureHost = FakeArcHost(
      "PureHost",
      listOf(updatedPlan.particles.find { it.location.contains("PureParticle") }!!)
    )
    hostRegistry.registerHost(readingHost)
    hostRegistry.registerHost(writingHost)
    hostRegistry.registerHost(pureHost)

    val arc = allocator.startArcForPlan(updatedPlan)

    val testKeys = listOf(inputPerson, outputPerson)

    arc.partitions.flatMap { it.particles }.forEach { particle ->
      particle.handles.forEach { (_, connection) ->
        assertThat(connection.storageKey).isIn(testKeys)
      }
    }
  }

  @Test
  fun startArcForPlan_startsArcHosts() = scope.runBlockingTest {
    val readingHost = FakeArcHost("ReadingHost", listOf(READ_PARTICLE))
    val writingHost = FakeArcHost("WritingHost", listOf(WRITE_PARTICLE))
    val pureHost = FakeArcHost("PureHost", listOf(PURE_PARTICLE))
    hostRegistry.registerHost(readingHost)
    hostRegistry.registerHost(writingHost)
    hostRegistry.registerHost(pureHost)
    val arc = allocator.startArcForPlan(PLAN)

    arc.partitions.forEach {
      val host = allocator.lookupArcHost(it.arcHost) as FakeArcHost
      assertThat(host.lookupArcHostStatusResult).isEqualTo(ArcState.Running)
    }
  }

  @Test
  fun startArcForPlan_onlyUnknownParticles_throws() = scope.runBlockingTest {
    val readingHost = FakeArcHost("ReadingHost", listOf(READ_PARTICLE))
    val writingHost = FakeArcHost("WritingHost", listOf(WRITE_PARTICLE))
    val pureHost = FakeArcHost("PureHost", listOf(PURE_PARTICLE))
    hostRegistry.registerHost(readingHost)
    hostRegistry.registerHost(writingHost)
    hostRegistry.registerHost(pureHost)

    val particleLens = Plan.particleLens.traverse()

    val plan = particleLens.mod(PLAN) { particle ->
      particle.copy(
        particleName = "Unknown ${particle.particleName}",
        location = "unknown.${particle.location}"
      )
    }
    assertFailsWith<ParticleNotFoundException> {
      allocator.startArcForPlan(plan)
    }
  }

  private fun findPartitionFor(
    partitions: List<Plan.Partition>,
    particleName: String
  ) = partitions.find { partition ->
    partition.particles.any { it.particleName == particleName }
  }!!

  private class FakeHostRegistry : HostRegistry() {
    private val hosts = mutableSetOf<ArcHost>()

    override suspend fun availableArcHosts(): List<ArcHost> = hosts.toList()

    override suspend fun registerHost(host: ArcHost) {
      hosts.add(host)
    }

    override suspend fun unregisterHost(host: ArcHost) {
      hosts.remove(host)
    }
  }

  private class FakePartitionSerialization : Allocator.PartitionSerialization {
    var setPartitionsCallValue: List<Plan.Partition>? = null
    var readAndClearPartitionsArcId: ArcId? = null

    override suspend fun set(partitions: List<Plan.Partition>) {
      setPartitionsCallValue = partitions
    }

    override suspend fun readPartitions(arcId: ArcId): List<Plan.Partition> {
      return setPartitionsCallValue ?: emptyList()
    }

    override suspend fun readAndClearPartitions(arcId: ArcId): List<Plan.Partition> {
      readAndClearPartitionsArcId = arcId
      val value = setPartitionsCallValue ?: emptyList()
      setPartitionsCallValue = emptyList()
      return value
    }
  }

  private class FakeArcHost(
    override val hostId: String,
    val particles: Collection<Plan.Particle>
  ) : ArcHost {
    var lookupArcHostStatusResult = ArcState.NeverStarted
    var startArcPartition: Plan.Partition? = null
    var stopArcPartition: Plan.Partition? = null
    var throwExceptionOnStart: Boolean = false

    val log = TaggedLog { "FakeArcHost" }

    override suspend fun registeredParticles(): List<ParticleIdentifier> {
      return particles.map { ParticleIdentifier.from(it.location) }
    }

    override suspend fun startArc(partition: Plan.Partition) = suspendCoroutine<Unit> { cont ->
      log.debug { "started arc in host '${hostId}'." }
      log.debug { "running partition, '${partition}'." }
      startArcPartition = partition
      if (throwExceptionOnStart) {
        cont.resumeWithException(ArcHostException("Uh oh!", "Stack"))
        lookupArcHostStatusResult = ArcState.Error
      } else {
        cont.resume(Unit)
        lookupArcHostStatusResult = ArcState.Running
      }
    }

    override suspend fun stopArc(partition: Plan.Partition) {
      stopArcPartition = partition
    }

    override suspend fun lookupArcHostStatus(partition: Plan.Partition): ArcState {
      return lookupArcHostStatusResult
    }

    override suspend fun isHostForParticle(particle: Plan.Particle): Boolean {
      return particles.any { it == particle }
    }

    override suspend fun pause() = Unit
    override suspend fun unpause() = Unit
    override suspend fun waitForArcIdle(arcId: String) = Unit

    override suspend fun addOnArcStateChange(
      arcId: ArcId,
      block: ArcStateChangeCallback
    ): ArcStateChangeRegistration {
      return ArcStateChangeRegistration("asdf")
    }
  }

  class FakeStorageKeyCreator : Allocator.StorageKeyCreator {
    var createdStorageKeys: Boolean = false

    override fun createStorageKeysIfNecessary(
      arcId: ArcId,
      idGenerator: Id.Generator,
      plan: Plan
    ): Plan {
      createdStorageKeys = true
      return plan
    }
  }

  companion object {
    val PARTICLE1 = particle("MyParticle", "com.arcs.MyParticle")
    val PARTICLE2 = particle("YourParticle", "com.arcs.YourParticle")
    val PARTICLE3 = particle("OurParticle", "com.arcs.OurParticle")

    val PERSON_SCHEMA = schema("Person") {
      singletons {
        "name" to FieldType.Text
      }
      hash = "abcdf"
    }
    val PERSON_INPUT_HANDLE = handle(DummyStorageKey("create://personInputHandle")) {
      type = SingletonType(EntityType(PERSON_SCHEMA))
    }
    val PERSON_OUTPUT_HANDLE = handle(DummyStorageKey("create://personOutputHandle")) {
      type = SingletonType(EntityType(PERSON_SCHEMA))
    }
    val READ_PARTICLE = particle("ReadParticle", "com.arcs.ReadParticle") {
      handleConnection("person", HandleMode.Read, PERSON_INPUT_HANDLE)
    }
    val WRITE_PARTICLE = particle("WriteParticle", "com.arcs.WriteParticle") {
      handleConnection("person", HandleMode.Write, PERSON_OUTPUT_HANDLE)
    }
    val PURE_PARTICLE = particle("PureParticle", "com.arcs.PureParticle") {
      handleConnection("inputPerson", HandleMode.Read, PERSON_INPUT_HANDLE)
      handleConnection("outputPerson", HandleMode.Write, PERSON_OUTPUT_HANDLE)
    }
    val PLAN = plan {
      add(READ_PARTICLE)
      add(WRITE_PARTICLE)
      add(PURE_PARTICLE)
      add(PERSON_INPUT_HANDLE)
      add(PERSON_OUTPUT_HANDLE)
    }
  }
}
