/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.host

import arcs.core.data.Plan.Particle
import arcs.core.data.Plan.Partition
import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.util.testutil.FakeTime
import com.google.common.truth.Truth
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class SerializingArcHostTest : AbstractArcHostTestBase() {

  class SerializingTestHost(
    handleManagerFactory: HandleManagerFactory,
    vararg particles: ParticleRegistration
  ) : TestHost(
    handleManagerFactory,
    serializationEnabled = true,
    *particles
  ) {
    constructor(schedulerProvider: SchedulerProvider, vararg particles: ParticleRegistration) :
      this(
        HandleManagerFactory(
          schedulerProvider,
          testStorageEndpointManager(),
          platformTime = FakeTime()
        ),
        *particles
      )
  }

  override fun createHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) = SerializingTestHost(schedulerProvider, *particles)

  @Test
  fun errorStateHoldsExceptionsFromParticles() = runBlocking {
    TestParticle.failAtStart = true

    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = createHost(schedulerProvider, ::TestParticle.toRegistration())
    val particle = Particle(
      "Test",
      "arcs.core.host.AbstractArcHostTestBase.TestParticle",
      mapOf()
    )
    val partition = Partition("arcId", "arcHost", listOf(particle))
    host.startArc(partition)

    host.lookupArcHostStatus(partition).let {
      Truth.assertThat(it).isEqualTo(ArcState.Error)
      Truth.assertThat(it.cause).isInstanceOf(IllegalStateException::class.java)
      Truth.assertThat(it.cause).hasMessageThat().isEqualTo("boom")
    }

    // Check that the error state persists across serialization.
    host.pause()
    host.clearCache()
    host.unpause()

    // The exact type of the exception is lost, but its toString form is retainted.
    host.lookupArcHostStatus(partition).let {
      Truth.assertThat(it).isEqualTo(ArcState.Error)
      Truth.assertThat(it.cause).isInstanceOf(DeserializedException::class.java)
      Truth.assertThat(it.cause).hasMessageThat().isEqualTo("java.lang.IllegalStateException: boom")
    }

    schedulerProvider.cancelAll()
  }
}
