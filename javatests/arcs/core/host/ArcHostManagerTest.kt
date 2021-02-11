package arcs.core.host

import arcs.jvm.host.ExplicitHostRegistry
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
open class ArcHostManagerTest {

  @Test
  fun pauseAllHostsFor_pausesHostsBeforeRunning() = runBlocking {
    val hosts = listOf(
      NoOpArcHost("host1"),
      NoOpArcHost("host2"),
      NoOpArcHost("host3")
    )
    val hostRegistry = ExplicitHostRegistry()

    hosts.forEach {
      hostRegistry.registerHost(it)
      assertThat(it.isPaused).isFalse()
    }

    var callbackWasRun = false
    ArcHostManager.pauseAllHostsFor {
      callbackWasRun = true
      // All hosts have been paused
      hosts.forEach { assertThat(it.isPaused).isTrue() }
    }
    assertThat(callbackWasRun).isTrue()
  }

  @Test
  fun pauseAllHostsFor_unpausesHostsAfterwards() = runBlocking {
    val hosts = listOf(
      NoOpArcHost("host1"),
      NoOpArcHost("host2"),
      NoOpArcHost("host3")
    )
    val hostRegistry = ExplicitHostRegistry()

    hosts.forEach {
      hostRegistry.registerHost(it)
      assertThat(it.isPaused).isFalse()
    }

    var callbackWasRun = false
    ArcHostManager.pauseAllHostsFor {
      callbackWasRun = true
    }
    assertThat(callbackWasRun).isTrue()

    // All hosts have been unpaused
    hosts.forEach { assertThat(it.isPaused).isFalse() }
  }
}
