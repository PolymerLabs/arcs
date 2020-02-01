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

package arcs.android.host

import android.content.Context
import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import arcs.android.sdk.host.toArcHost
import arcs.core.host.ParticleIdentifier
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric

@RunWith(AndroidJUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
class AndroidHostRegistryTest {
    private lateinit var context: Context
    private lateinit var service: TestReadingExternalHostService
    private lateinit var hostRegistry: AndroidManifestHostRegistry
    private lateinit var sender: (Intent) -> Unit

    @Before
    fun setUp() = runBlocking {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        service = Robolectric.setupService(TestReadingExternalHostService::class.java)
        sender = { intent -> service.onStartCommand(intent, 0, 0) }
        hostRegistry =
            AndroidManifestHostRegistry.createForTest(
                context, sender
            )
    }

    @Test
    fun hostRegistry_availableArcHosts_containsTestArcHost() = runBlockingTest {
        assertThat(hostRegistry.availableArcHosts()).contains(
            TestReadingExternalHostService().toArcHost(context, sender)
        )
    }

    @Test
    fun hostRegistry_arcHost_canRegisterUnregisterParticle() {
        runBlocking {
            val particle = ParticleIdentifier("foo.bar", "Baz")
            val arcHost = hostRegistry.availableArcHosts()
                .filter {
                    it.hostId().equals(
                        TestReadingExternalHostService().toArcHost(context, sender).hostId()
                    )
                }
                .first()
            arcHost.registerParticle(particle)
            assertThat(arcHost.registeredParticles()).contains(particle)
        }
    }
}
