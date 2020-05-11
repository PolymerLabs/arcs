package arcs.core.host

import arcs.core.data.Plan
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.jvm.host.JvmSchedulerProvider
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
open class AbstractArcHostTest {

    @Before
    fun setUp() {
        RamDisk.clear()
        RamDiskStorageKey.registerKeyCreator()
        RamDiskDriverProvider()
    }

    @Test
    fun pause_Unpause() = runBlocking {
        val schedulerProvider = JvmSchedulerProvider(coroutineContext)
        val host  = TestHost(schedulerProvider("arcId"))
        val partition = Plan.Partition("arcId", "arcHost", listOf())
        val partition2 = Plan.Partition("arcId2", "arcHost", listOf())
        val partition3 = Plan.Partition("arcId3", "arcHost", listOf())
        host.startArc(partition)
        assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)
        
        host.pause()

        assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Stopped)
        // Start while in pause, should only start after unpause().
        host.startArc(partition2)
        assertThat(host.lookupArcHostStatus(partition2)).isEqualTo(ArcState.NeverStarted)
        // Resurrect while in pause, should only start after unpause().
        host.onResurrected("arcId3", listOf())
        assertThat(host.lookupArcHostStatus(partition3)).isEqualTo(ArcState.NeverStarted)

        host.unpause()

        assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)
        assertThat(host.lookupArcHostStatus(partition2)).isEqualTo(ArcState.Running)
        assertThat(host.lookupArcHostStatus(partition3)).isEqualTo(ArcState.Running)

        schedulerProvider.cancelAll()
    }
}
