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

import arcs.core.data.Plan
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.host.HandleManagerImpl
import arcs.core.host.HostRegistry
import arcs.core.host.ParticleNotFoundException
import arcs.core.host.SimpleSchedulerProvider
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers

/**
  * An [Allocator] takes a [Plan] and a mapping of [Particle]s to [ArcHost]s, then partitions
  * the [Plan] across [ArcHost]s.
  *
  * Invariants for [Allocator]:
  * - a [Plan] with unmapped [Particle]s will generate an error.
  * - a valid [Plan] that only references mapped [Particle]s will resolve
  * - // TODO(b/176945883): a particle will never be in more than one partition.
  * - // TODO(b/176945883): every particle will end up in a partition.
  */

fun allocator(hostRegistry: HostRegistry): Allocator {
  return Allocator.create(
    hostRegistry,
    HandleManagerImpl(
      time = FakeTime(),
      scheduler = SimpleSchedulerProvider(Dispatchers.Default)("allocator"),
      storageEndpointManager = testStorageEndpointManager(),
      foreignReferenceChecker = ForeignReferenceCheckerImpl(emptyMap())
    ),
    CoroutineScope(Dispatchers.Default)
  )
}

/**
 * Given a [Plan], a [HostRegistry], and a [Plan.Particle] that is *not* mapped
 * by the [HostRegistry], adding that [Plan.Particle] to the [Plan] will produce a
 * [Plan] which will throw a [ParticleNotFoundException] when started.
 */
suspend fun invariant_addUnmappedParticle_generatesError(
  plan: Plan,
  hostRegistry: HostRegistry,
  extraParticle: Plan.Particle
) {
  // Precondition: extraParticle is *not* hosted by an ArcHost
  assertThat(
    hostRegistry.availableArcHosts().none { it.isHostForParticle(extraParticle) }
  ).isTrue()

  // Invariant: starting a plan with an unhosted particle will throw an exception.
  val allocator = allocator(hostRegistry)
  val modifiedPlan = Plan.particleLens.mod(plan) {
    val list = it.toMutableList()
    list.add(extraParticle)
    list
  }
  assertFailsWith<ParticleNotFoundException> {
    allocator.startArcForPlan(modifiedPlan)
  }
}

/**
 * Given a [Plan] and a [HostRegistry], and assuming that every [Plan.Particle] in the
 * [Plan] is mapped by the [HostRegistry], that [Plan] is guaranteed to start without
 * throwing an exception.
 */
suspend fun invariant_planWithOnly_mappedParticles_willResolve(
  plan: Plan,
  hostRegistry: HostRegistry
) {
  // Precondition: every particle in the plan is hosted by an ArcHost.
  plan.particles.forEach {
    assertThat(hostRegistry.availableArcHosts().any {
      host -> host.isHostForParticle(it)
    }).isTrue()
  }

  // Invariant: A plan that contains only hosted particles can be used to successfully start an Arc
  val allocator = allocator(hostRegistry)
  allocator.startArcForPlan(plan)
}
