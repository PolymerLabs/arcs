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
  fun pauseAllHostsFor() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val hosts = listOf(
      PausableTestingHost(schedulerProvider),
      PausableTestingHost(schedulerProvider),
      PausableTestingHost(schedulerProvider)
    )
    val hostRegistry = ExplicitHostRegistry()
    hosts.forEach { hostRegistry.registerHost(it) }

    assertThat(PausableTestingHost.numPauses).isEqualTo(0)
    assertThat(PausableTestingHost.numUnpauses).isEqualTo(0)

    ArcHostManager.pauseAllHostsFor {
      // All hosts have been paused
      assertThat(PausableTestingHost.numPauses).isEqualTo(3)
      assertThat(PausableTestingHost.numUnpauses).isEqualTo(0)
    }

    // All hosts have been unpaused
    assertThat(PausableTestingHost.numPauses).isEqualTo(3)
    assertThat(PausableTestingHost.numUnpauses).isEqualTo(3)

    schedulerProvider.cancelAll()
  }
}
