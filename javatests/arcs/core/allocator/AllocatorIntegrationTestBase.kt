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

import arcs.core.data.CreatableStorageKey
import arcs.core.data.Plan
import arcs.core.host.ArcState
import arcs.core.host.NonRelevant
import arcs.core.host.ParticleState
import arcs.core.host.PersonPlan
import arcs.core.host.ReadPerson
import arcs.core.host.WritePerson
import arcs.core.host.toRegistration
import arcs.core.util.Log
import arcs.core.util.plus
import arcs.core.util.testutil.LogRule
import arcs.core.util.traverse
import com.google.common.truth.Truth
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
open class AllocatorIntegrationTestBase : AllocatorTestFramework() {
  @get:Rule
  val log = LogRule(Log.Level.Warning)

  private fun findPartitionFor(
    partitions: List<Plan.Partition>,
    particleName: String
  ) = partitions.find { partition ->
    partition.particles.any { it.particleName == particleName }
  }!!

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

    Truth.assertThat(arc.partitions).containsExactly(
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
        Truth.assertThat(connection.storageKey).isInstanceOf(CreatableStorageKey::class.java)
      }
    }
    log("Plan handles are using correct storage keys")
    val arc = allocator.startArcForPlan(PersonPlan).waitForStart()

    log("Arc started.")
    arc.partitions.flatMap { it.particles }.forEach { particle ->
      particle.handles.forEach { (_, connection) ->
        Truth.assertThat(connection.storageKey).isNotInstanceOf(
          CreatableStorageKey::class.java
        )
      }
    }
    log("Particle handles are using correct storage key types")
    val readPartition = findPartitionFor(arc.partitions, "ReadPerson")
    val purePartition = findPartitionFor(arc.partitions, "PurePerson")
    val writePartition = findPartitionFor(arc.partitions, "WritePerson")

    Truth.assertThat(readPartition.particles[0].handles["person"]?.storageKey).isEqualTo(
      purePartition.particles[0].handles["outputPerson"]?.storageKey
    )

    Truth.assertThat(writePartition.particles[0].handles["person"]?.storageKey).isEqualTo(
      purePartition.particles[0].handles["inputPerson"]?.storageKey
    )

    Truth.assertThat(purePartition.particles[0].handles["inputPerson"]?.storageKey).isNotEqualTo(
      purePartition.particles[0].handles["outputPerson"]?.storageKey
    )
  }

  @Test
  open fun allocator_canStartArcInTwoExternalHosts() = allocator_canStartArcInTwoExternalHostsImpl()

  @Test
  open fun allocator_withNonRelevantParticle_canStartArcInTwoExternalHosts() =
    allocator_canStartArcInTwoExternalHostsImpl(true)

  /** nonRelevant = true causes an extra unused particle to be added to the reading ArcHost */
  fun allocator_canStartArcInTwoExternalHostsImpl(nonRelevant: Boolean = false) = runAllocatorTest {
    if (nonRelevant) {
      val registration = ::NonRelevant.toRegistration()
      readingExternalHost.registerTestParticle(registration.first, registration.second)
    }

    val arc = allocator.startArcForPlan(PersonPlan)
    val arcId = arc.id

    arc.waitForStart()

    Truth.assertThat(readingExternalHost.started.size).isEqualTo(1)
    Truth.assertThat(writingExternalHost.started.size).isEqualTo(1)

    Truth.assertThat(arc.partitions).contains(
      readingExternalHost.started.first()
    )
    Truth.assertThat(arc.partitions).contains(
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

    Truth.assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Running)
    Truth.assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Running)

    writePersonContext.particle.let { particle ->
      particle as WritePerson
      particle.await()
      Truth.assertThat(particle.firstStartCalled).isTrue()
      Truth.assertThat(particle.wrote).isTrue()
    }

    readPersonContext.particle.let { particle ->
      particle as ReadPerson
      particle.await()
      Truth.assertThat(particle.firstStartCalled).isTrue()
      Truth.assertThat(particle.name).isEqualTo("Hello John Wick")
    }
  }
}
