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

import arcs.core.data.Plan
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.driver.RamDisk
import arcs.jvm.host.ExplicitHostRegistry
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
open class ArcHostManagerIntegrationTest {

  @Before
  fun setUp() = runBlocking<Unit> {
    RamDisk.clear()
    DriverAndKeyConfigurator.configure(null)
  }

  @Test
  fun pauseAllHostsFor() = runBlocking {
    val schedulerProvider = SimpleSchedulerProvider(coroutineContext)
    val host = TestHost(schedulerProvider)
    val hostRegistry = ExplicitHostRegistry()
    hostRegistry.registerHost(host)

    val partition = Plan.Partition("arcId", "arcHost", listOf())
    host.startArc(partition)
    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)

    var stateDuringPause: ArcState? = null
    ArcHostManager.pauseAllHostsFor {
      stateDuringPause = host.lookupArcHostStatus(partition)
    }
    assertThat(stateDuringPause).isEqualTo(ArcState.Stopped)

    assertThat(host.lookupArcHostStatus(partition)).isEqualTo(ArcState.Running)

    schedulerProvider.cancelAll()
  }
}
