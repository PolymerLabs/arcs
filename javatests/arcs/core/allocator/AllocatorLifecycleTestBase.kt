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

import arcs.core.data.Annotation
import arcs.core.data.Plan
import arcs.core.host.ArcState
import arcs.core.host.HelloHelloPlan
import arcs.core.host.MultiplePersonPlan
import arcs.core.host.ParticleState
import arcs.core.host.PersonPlan
import arcs.core.host.ReadPerson
import arcs.core.host.WritePerson
import arcs.core.util.Log
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
open class AllocatorLifecycleTestBase : AllocatorTestFramework() {
  @get:Rule
  val log = LogRule(Log.Level.Warning)

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
      Truth.assertThat(particle.firstStartCalled).isTrue()
      Truth.assertThat(particle.wrote).isTrue()
    }

    readPersonContext.particle.let { particle ->
      particle as ReadPerson
      particle.await()
      Truth.assertThat(particle.firstStartCalled).isTrue()
      Truth.assertThat(particle.name).isEqualTo("Hello Hello John Wick")
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
      Truth.assertThat(particle.firstStartCalled).isTrue()
      Truth.assertThat(particle.wrote).isTrue()
    }

    readPersonContext.particle.let { particle ->
      particle as ReadPerson
      particle.await()
      Truth.assertThat(particle.firstStartCalled).isTrue()
      Truth.assertThat(particle.name).isEqualTo("Hello John Wick")
    }

    writePersonContext2.particle.let { particle ->
      particle as WritePerson
      particle.await()
      Truth.assertThat(particle.firstStartCalled).isTrue()
      Truth.assertThat(particle.wrote).isTrue()
    }

    readPersonContext2.particle.let { particle ->
      particle as ReadPerson
      particle.await()
      Truth.assertThat(particle.firstStartCalled).isTrue()
      Truth.assertThat(particle.name).isEqualTo("Hello John Wick")
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

    Truth.assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Stopped)
    Truth.assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Stopped)

    Truth.assertThat((writePersonContext.particle as WritePerson).shutdownCalled).isTrue()
    Truth.assertThat((readPersonContext.particle as ReadPerson).shutdownCalled).isTrue()

    Truth.assertThat(readingExternalHost.isIdle()).isTrue()
    Truth.assertThat(writingExternalHost.isIdle()).isTrue()
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

    Truth.assertThat(readPersonContext.particleState).isEqualTo(ParticleState.Running)
    Truth.assertThat(writePersonContext.particleState).isEqualTo(ParticleState.Running)

    // onFirstStart() not called a second time
    Truth.assertThat((writePersonContext.particle as WritePerson).firstStartCalled).isFalse()
    Truth.assertThat((readPersonContext.particle as ReadPerson).firstStartCalled).isFalse()
  }
}
