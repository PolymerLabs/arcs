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
import arcs.core.common.toArcId
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.Plan
import arcs.core.data.ReferenceType
import arcs.core.data.SchemaRegistry
import arcs.core.data.SingletonType
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
import arcs.core.storage.testutil.DummyStorageKey
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

  @Before
  fun setUp() {
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
    val particle1 = particle("ParticleOne", "com.arcs.ParticleOne")
    val particle2 = particle("ParticleTwo", "com.arcs.ParticleTwo")
    val particle3 = particle("ParticleThree", "com.arcs.ParticleThree")

    val host1 = FakeArcHost("Host1", listOf(particle1, particle2))
    val host2 = FakeArcHost("Host2", listOf(particle3))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val partitions = listOf(
      Plan.Partition("!:myArc", "Host1", listOf(particle1, particle2)),
      Plan.Partition("!:myArc", "Host2", listOf(particle3))
    )
    val plan = plan {
      arcId = "myArc"

      add(particle1)
      add(particle2)
      add(particle3)
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
    val particle1 = particle("ParticleOne", "com.arcs.ParticleOne")
    val particle2 = particle("ParticleTwo", "com.arcs.ParticleTwo")
    val particle3 = particle("ParticleThree", "com.arcs.ParticleThree")

    val host1 = FakeArcHost("Host1", listOf(particle1, particle2))
    val host2 = FakeArcHost("Host2", listOf(particle3))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val partitions = listOf(
      Plan.Partition("!:arc", "Host1", listOf(particle1, particle2)),
      Plan.Partition("!:arc", "Host2", listOf(particle3))
    )
    val plan = plan {
      add(particle1)
      add(particle2)
      add(particle3)
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
    val particle1 = particle("ParticleOne", "com.arcs.ParticleOne")
    val particle2 = particle("ParticleTwo", "com.arcs.ParticleTwo")
    val plan = plan {
      add(particle1)
      add(particle2)
    }
    val host1 = FakeArcHost("Host1", listOf(particle1))
    hostRegistry.registerHost(host1)

    assertFailsWith<ParticleNotFoundException> { allocator.startArcForPlan(plan) }
  }

  @Test
  fun startArcForPlan_whenHostThrows_reThrowsAndStops() = scope.runBlockingTest {
    val particle1 = particle("MyParticle", "com.arcs.MyParticle")
    val particle2 = particle("YourParticle", "com.arcs.YourParticle")
    val host1 = FakeArcHost("HostOne", listOf(particle1))
    host1.throwExceptionOnStart = true
    val host2 = FakeArcHost("HostTwo", listOf(particle2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val plan = plan {
      add(particle1)
      add(particle2)
    }

    assertFailsWith<ArcHostException> { allocator.startArcForPlan(plan) }

    // Check that both hosts have been asked to stop the arc.
    assertThat(host1.stopArcPartition).isNotNull()
    assertThat(host2.stopArcPartition).isNotNull()
  }

  @Test
  fun stopArc_clearsPartitionsFromPartitionSerialization() = scope.runBlockingTest {
    val particle1 = particle("MyParticle", "com.arcs.MyParticle")
    val particle2 = particle("YourParticle", "com.arcs.YourParticle")
    val host1 = FakeArcHost("HostOne", listOf(particle1))
    val host2 = FakeArcHost("HostTwo", listOf(particle2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    partitionMap.set(
      listOf(
        Plan.Partition("!:myArc", "HostOne", listOf(particle1)),
        Plan.Partition("!:myArc", "HostTwo", listOf(particle2))
      )
    )

    allocator.stopArc("myArc".toArcId())

    assertThat(partitionMap.readAndClearPartitionsArcId).isEqualTo("myArc".toArcId())
    assertThat(host1.stopArcPartition).isEqualTo(
      Plan.Partition("!:myArc", "HostOne", listOf(particle1))
    )
    assertThat(host2.stopArcPartition).isEqualTo(
      Plan.Partition("!:myArc", "HostTwo", listOf(particle2))
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
    val particle = particle("MyParticle", "com.arcs.MyParticle")

    assertFailsWith<ParticleNotFoundException> { allocator.findArcHostByParticle(particle) }
  }

  @Test
  fun findArcHostByParticle_findsSupportingHost() = scope.runBlockingTest {
    val particle1 = particle("MyParticle", "com.arcs.MyParticle")
    val particle2 = particle("YourParticle", "com.arcs.YourParticle")
    val host1 = FakeArcHost("Host1", listOf(particle1))
    val host2 = FakeArcHost("Host2", listOf(particle2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)

    assertThat(allocator.findArcHostByParticle(particle1)).isEqualTo(host1)
    assertThat(allocator.findArcHostByParticle(particle2)).isEqualTo(host2)
  }

  @Test
  fun createNonSerializing_exercise() = scope.runBlockingTest {
    val allocator = Allocator.createNonSerializing(hostRegistry, scope)

    val particle1 = particle("MyParticle", "com.arcs.MyParticle")
    val particle2 = particle("YourParticle", "com.arcs.YourParticle")
    val host1 = FakeArcHost("HostOne", listOf(particle1))
    val host2 = FakeArcHost("HostTwo", listOf(particle2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val plan = plan {
      add(particle1)
      add(particle2)
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

    val particle1 = particle("MyParticle", "com.arcs.MyParticle")
    val particle2 = particle("YourParticle", "com.arcs.YourParticle")
    val host1 = FakeArcHost("HostOne", listOf(particle1))
    val host2 = FakeArcHost("HostTwo", listOf(particle2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val plan = plan {
      add(particle1)
      add(particle2)
    }

    invariant_addUnmappedParticle_generatesError(plan, hostRegistry, unknownParticle)
  }

  /**
   * Test that PersonPlan can be started with a hostRegistry established for this purpose.
   */
  @Test
  fun canPartitionArcInExternalHosts() = runBlocking {
    val particle1 = particle("MyParticle", "com.arcs.MyParticle")
    val particle2 = particle("YourParticle", "com.arcs.YourParticle")
    val host1 = FakeArcHost("HostOne", listOf(particle1))
    val host2 = FakeArcHost("HostTwo", listOf(particle2))
    hostRegistry.registerHost(host1)
    hostRegistry.registerHost(host2)
    val plan = plan {
      add(particle1)
      add(particle2)
    }

    invariant_planWithOnly_mappedParticles_willResolve(plan, hostRegistry)
  }

//  /**
//   * Tests that the Recipe is properly partitioned so that [ReadingHost] contains only
//   * [ReadPerson] with associated handles and connections, and [WritingHost] contains only
//   * [WritePerson] with associated handles and connections.
//   */
//  @Test
//  fun computePartitions(): Unit = scope.runBlockingTest {
//    val personHandle = handle(DummyStorageKey("personHandle")) {
//        type = SingletonType(EntityType(schema("asdf")))
//      }
//    val readParticle = particle("ReadParticle", "com.arcs.ReadParticle") {
//      handleConnection("person", HandleMode.Read, personHandle)
//    }
//    val writeParticle = particle("WriteParticle", "com.arcs.WriteParticle") {
//      handleConnection("person", HandleMode.Write, personHandle)
//    }
//    val readingHost = FakeArcHost("ReadingHost", listOf(readParticle))
//    val writingHost = FakeArcHost("WritingHost", listOf(writeParticle))
//    hostRegistry.registerHost(readingHost)
//    hostRegistry.registerHost(writingHost)
//    val plan = plan {
//      add(personHandle)
//      add(readParticle)
//      add(writeParticle)
//    }
//
//    val arc = allocator.startArcForPlan(plan).waitForStart()
//
//    val allStorageKeyLens =
//      Plan.Particle.handlesLens.traverse() + Plan.HandleConnection.handleLens +
//        Plan.Handle.storageKeyLens
//
//    // fetch the allocator replaced key
//    val readPersonKey = findPartitionFor(
//      arc.partitions, "ReadParticle"
//    ).particles[0].handles["person"]?.storageKey!!
//
//    val writePersonKey = findPartitionFor(
//      arc.partitions, "WriteParticle"
//    ).particles[0].handles["person"]?.storageKey!!
//
//    assertThat(arc.partitions).containsExactly(
//      Plan.Partition(
//        arc.id.toString(),
//        readingHost.hostId,
//        // replace the CreatableKeys with the allocated keys
//        listOf(allStorageKeyLens.mod(readParticle) { readPersonKey })
//      ),
//      Plan.Partition(
//        arc.id.toString(),
//        writingHost.hostId,
//        // replace the CreatableKeys with the allocated keys
//        listOf(allStorageKeyLens.mod(writeParticle) { writePersonKey })
//      )
//    )
//    allocator.stopArc(arc.id)
//  }

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

    override suspend fun registeredParticles(): List<ParticleIdentifier> {
      return particles.map { ParticleIdentifier.from(it.location) }
    }

    override suspend fun startArc(partition: Plan.Partition) = suspendCoroutine<Unit> { cont ->
      startArcPartition = partition
      if (throwExceptionOnStart) {
        cont.resumeWithException(ArcHostException("Uh oh!", "Stack"))
      } else {
        cont.resume(Unit)
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
}
