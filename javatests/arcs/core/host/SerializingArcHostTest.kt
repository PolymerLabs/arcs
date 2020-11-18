package arcs.core.host

import arcs.core.data.Plan.Particle
import arcs.core.data.Plan.Partition
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
    vararg particles: ParticleRegistration
  ) : TestHost(*particles) {
    override val serializationEnabled = true
  }

  override fun createHost(
    vararg particles: ParticleRegistration
  ) = SerializingTestHost(*particles)

  @Test
  fun errorStateHoldsExceptionsFromParticles() = runBlocking {
    TestParticle.failAtStart = true

    val host = createHost(::TestParticle.toRegistration())
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
  }
}
