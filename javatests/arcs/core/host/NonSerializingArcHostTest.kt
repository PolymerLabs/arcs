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

import arcs.core.storage.testutil.testStorageEndpointManager
import arcs.jvm.util.testutil.FakeTime
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class NonSerializingArcHostTest : AbstractArcHostTestBase() {

  class SerializingTestHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) : TestHost(
    HandleManagerFactory(
      schedulerProvider,
      testStorageEndpointManager(),
      platformTime = FakeTime()
    ),
    serializationEnabled = false,
    *particles
  )

  override fun createHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
  ) = SerializingTestHost(schedulerProvider, *particles)
}
