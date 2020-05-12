package arcs.core.host

import arcs.core.data.Plan
import arcs.core.storage.driver.RamDisk
import arcs.core.storage.driver.RamDiskDriverProvider
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.jvm.host.ExplicitHostRegistry
import arcs.jvm.host.JvmSchedulerProvider
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
open class ArcHostManagerTest {

    @Before
    fun setUp() {
        RamDisk.clear()
        RamDiskStorageKey.registerKeyCreator()
        RamDiskDriverProvider()
    }

    @Ignore("b/156404564 - Deflake")
    @Test
    fun pauseAll_UnpauseAll() = runBlocking {
        val schedulerProvider = JvmSchedulerProvider(coroutineContext)
        val host  = TestHost(schedulerProvider("arcId"))
        val hostRegistry = ExplicitHostRegistry()
        hostRegistry.registerHost(host)

        val partition = Plan.Partition("arcId", "arcHost", listOf())
        host.startArc(partition)
        assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)
        
        ArcHostManager.pauseAllHosts()
        assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Stopped)

        ArcHostManager.unPauseAllHosts()
        assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)

        schedulerProvider.cancelAll()
    }
}
