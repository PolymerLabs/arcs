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
package arcs.core.host

import arcs.core.data.Plan
import arcs.core.host.api.Particle
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("UNCHECKED_CAST")
class HandleHolderLifecycleTest : AbstractArcHostTestBase() {

  class ParticleSpyArcHost(
    handleManagerFactory: HandleManagerFactory,
    vararg particles: ParticleRegistration
  ) : TestHost(handleManagerFactory, serializationEnabled = false, particles = particles) {

    private var particleCallback: ((Particle) -> Unit)? = null

    fun registerParticleInstantiationCallback(block: (Particle) -> Unit) {
      particleCallback = block
    }

    override suspend fun instantiateParticle(
      identifier: ParticleIdentifier,
      spec: Plan.Particle?
    ): Particle {
      val currentParticle = super.instantiateParticle(identifier, spec)
      particleCallback?.let { it(currentParticle) }
      return currentParticle
    }
  }

  override fun createHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ): TestHost = ParticleSpyArcHost(
    HandleManagerFactory(
      schedulerProvider,
      testStorageEndpointManager(),
      platformTime = FakeTime()
    ),
    *particles
  )

  @Test
  fun startArc_handleHolder_startsOutEmpty() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::TestParticle.toRegistration()) as ParticleSpyArcHost
    val partition = Plan.Partition(
      "arcId", "arcHost",
      listOf(
        Plan.Particle(
          "TestParticle",
          "arcs.core.host.AbstractArcHostTestBase.TestParticle",
          emptyMap()
        )
      )
    )

    var callbackExecuted = false
    host.registerParticleInstantiationCallback { particle ->
      assertThat(particle.handles.isEmpty()).isTrue()
      callbackExecuted = true
    }

    host.startArc(partition)
    assertThat(callbackExecuted).isTrue()
    host.waitForArcIdle("arcId")

    schedulerProvider.cancelAll()
  }
}
