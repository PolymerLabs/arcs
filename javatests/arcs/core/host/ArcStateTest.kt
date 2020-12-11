package arcs.core.host

import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ArcStateTest {
  @Test
  fun arcState_equals_and_hash_only_consider_state() {
    val errorState1 = ArcState.errorWith(Exception("test1"))
    val errorState2 = ArcState.errorWith(Exception("test2"))

    assertThat(errorState1).isEqualTo(errorState2)
    assertThat(errorState1.hashCode()).isEqualTo(errorState2.hashCode())
  }

  @Test
  fun arcState_serialize() {
    assertThat(ArcState.Deleted.toString()).isEqualTo("Deleted")
    assertThat(ArcState.Error.toString()).isEqualTo("Error")
    assertThat(ArcState.Indeterminate.toString()).isEqualTo("Indeterminate")
    assertThat(ArcState.NeverStarted.toString()).isEqualTo("NeverStarted")
    assertThat(ArcState.Running.toString()).isEqualTo("Running")
    assertThat(ArcState.Stopped.toString()).isEqualTo("Stopped")
    assertThat(ArcState.errorWith(Exception("test")).toString())
      .isEqualTo("Error|java.lang.Exception: test")
  }

  @Test
  fun arcState_deserialize() {
    assertThat(ArcState.fromString("Deleted")).isEqualTo(ArcState.Deleted)
    assertThat(ArcState.fromString("Error")).isEqualTo(ArcState.Error)
    assertThat(ArcState.fromString("Indeterminate")).isEqualTo(ArcState.Indeterminate)
    assertThat(ArcState.fromString("NeverStarted")).isEqualTo(ArcState.NeverStarted)
    assertThat(ArcState.fromString("Running")).isEqualTo(ArcState.Running)
    assertThat(ArcState.fromString("Stopped")).isEqualTo(ArcState.Stopped)
    assertThat(ArcState.fromString("Error|java.lang.Exception: test")).isEqualTo(ArcState.Error)
    assertThat(ArcState.fromString("Error|java.lang.Exception: test").cause.toString())
      .isEqualTo("arcs.core.host.DeserializedException: java.lang.Exception: test")
    assertThat(ArcState.fromString("Error|java.lang.Exception: test|foo").cause.toString())
      .isEqualTo("arcs.core.host.DeserializedException: java.lang.Exception: test|foo")
  }

  @Test
  fun particleState_serialize() {
    assertThat(ParticleState.Instantiated.toString()).isEqualTo("Instantiated")
    assertThat(ParticleState.FirstStart.toString()).isEqualTo("FirstStart")
    assertThat(ParticleState.Waiting.toString()).isEqualTo("Waiting")
    assertThat(ParticleState.Running.toString()).isEqualTo("Running")
    assertThat(ParticleState.Desynced.toString()).isEqualTo("Desynced")
    assertThat(ParticleState.Stopped.toString()).isEqualTo("Stopped")
    assertThat(ParticleState.Failed.toString()).isEqualTo("Failed")
    assertThat(ParticleState.Failed_NeverStarted.toString()).isEqualTo("Failed_NeverStarted")
    assertThat(ParticleState.MaxFailed.toString()).isEqualTo("MaxFailed")
    assertThat(ParticleState.failedWith(Exception("test")).toString())
      .isEqualTo("Failed|java.lang.Exception: test")
    assertThat(ParticleState.failedNeverStartedWith(Exception("test")).toString())
      .isEqualTo("Failed_NeverStarted|java.lang.Exception: test")
    assertThat(ParticleState.maxFailedWith(Exception("test")).toString())
      .isEqualTo("MaxFailed|java.lang.Exception: test")
  }

  @Test
  fun particleState_deserialize() {
    assertThat(ParticleState.fromString("Instantiated")).isEqualTo(ParticleState.Instantiated)
    assertThat(ParticleState.fromString("FirstStart")).isEqualTo(ParticleState.FirstStart)
    assertThat(ParticleState.fromString("Waiting")).isEqualTo(ParticleState.Waiting)
    assertThat(ParticleState.fromString("Running")).isEqualTo(ParticleState.Running)
    assertThat(ParticleState.fromString("Desynced")).isEqualTo(ParticleState.Desynced)
    assertThat(ParticleState.fromString("Stopped")).isEqualTo(ParticleState.Stopped)
    assertThat(ParticleState.fromString("Failed")).isEqualTo(ParticleState.Failed)
    assertThat(ParticleState.fromString("Failed_NeverStarted"))
      .isEqualTo(ParticleState.Failed_NeverStarted)
    assertThat(ParticleState.fromString("MaxFailed")).isEqualTo(ParticleState.MaxFailed)

    assertThat(ParticleState.fromString("Failed|java.lang.Exception: test"))
      .isEqualTo(ParticleState.Failed)
    assertThat(ParticleState.fromString("Failed|java.lang.Exception: test").cause.toString())
      .isEqualTo("arcs.core.host.DeserializedException: java.lang.Exception: test")
    assertThat(ParticleState.fromString("Failed|java.lang.Exception: test|foo").cause.toString())
      .isEqualTo("arcs.core.host.DeserializedException: java.lang.Exception: test|foo")

    assertThat(ParticleState.fromString("Failed_NeverStarted|java.lang.Exception: test"))
      .isEqualTo(ParticleState.Failed_NeverStarted)
    assertThat(
      ParticleState.fromString("Failed_NeverStarted|java.lang.Exception: test").cause.toString()
    ).isEqualTo("arcs.core.host.DeserializedException: java.lang.Exception: test")
    assertThat(
      ParticleState.fromString("Failed_NeverStarted|java.lang.Exception: test|foo").cause.toString()
    ).isEqualTo("arcs.core.host.DeserializedException: java.lang.Exception: test|foo")

    assertThat(ParticleState.fromString("MaxFailed|java.lang.Exception: test"))
      .isEqualTo(ParticleState.MaxFailed)
    assertThat(ParticleState.fromString("MaxFailed|java.lang.Exception: test").cause.toString())
      .isEqualTo("arcs.core.host.DeserializedException: java.lang.Exception: test")
    assertThat(ParticleState.fromString("MaxFailed|java.lang.Exception: test|foo").cause.toString())
      .isEqualTo("arcs.core.host.DeserializedException: java.lang.Exception: test|foo")
  }

  @Test
  fun particleState_hasBeenStarted() {
    assertThat(ParticleState.FirstStart.hasBeenStarted).isTrue()
    assertThat(ParticleState.Waiting.hasBeenStarted).isTrue()
    assertThat(ParticleState.Running.hasBeenStarted).isTrue()
    assertThat(ParticleState.Desynced.hasBeenStarted).isTrue()
    assertThat(ParticleState.Stopped.hasBeenStarted).isTrue()
    assertThat(ParticleState.Failed.hasBeenStarted).isTrue()

    assertThat(ParticleState.Instantiated.hasBeenStarted).isFalse()
    assertThat(ParticleState.Failed_NeverStarted.hasBeenStarted).isFalse()
    assertThat(ParticleState.MaxFailed.hasBeenStarted).isFalse()
  }

  @Test
  fun particleState_failed() {
    assertThat(ParticleState.Failed.failed).isTrue()
    assertThat(ParticleState.Failed_NeverStarted.failed).isTrue()
    assertThat(ParticleState.MaxFailed.failed).isTrue()

    assertThat(ParticleState.Instantiated.failed).isFalse()
    assertThat(ParticleState.FirstStart.failed).isFalse()
    assertThat(ParticleState.Waiting.failed).isFalse()
    assertThat(ParticleState.Running.failed).isFalse()
    assertThat(ParticleState.Desynced.failed).isFalse()
    assertThat(ParticleState.Stopped.failed).isFalse()
  }
}
