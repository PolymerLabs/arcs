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
import android.os.Bundle
import android.os.Handler
import android.os.ResultReceiver
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import arcs.android.sdk.host.ArcHostHelper
import arcs.android.sdk.host.createGetRegisteredParticlesIntent
import arcs.android.sdk.host.createRegisterParticleIntent
import arcs.android.sdk.host.createStartArcHostIntent
import arcs.android.sdk.host.createStopArcHostIntent
import arcs.android.sdk.host.createUnregisterParticleIntent
import arcs.android.sdk.host.toComponentName
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.host.ArcHost
import arcs.core.host.HandleConnectionSpec
import arcs.core.host.HandleSpec
import arcs.core.host.ParticleIdentifier
import arcs.core.host.ParticleSpec
import arcs.core.host.PlanPartition
import arcs.core.util.guardWith
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric

@RunWith(AndroidJUnit4::class)
@UseExperimental(ExperimentalCoroutinesApi::class)
class ArcHostHelperTest {
    private lateinit var context: Context
    private lateinit var helper: ArcHostHelper
    private lateinit var service: TestAndroidArcHostService
    private lateinit var arcHost: TestArcHost

    class TestArcHost : ArcHost {
        private val hostMutex = Mutex()
        var startArcCalls: MutableList<PlanPartition> by guardWith(hostMutex, mutableListOf())
        var stopArcCalls: MutableList<PlanPartition> by guardWith(hostMutex, mutableListOf())
        var registeredParticles: MutableList<ParticleIdentifier> by guardWith(
            hostMutex, mutableListOf()
        )

        suspend fun startCalls() = hostMutex.withLock { startArcCalls }
        suspend fun stopCalls() = hostMutex.withLock { stopArcCalls }
        suspend fun particles() = hostMutex.withLock { registeredParticles }

        override fun hostId() = this::class.java.canonicalName!!

        override suspend fun registerParticle(particle: ParticleIdentifier): Unit =
            hostMutex.withLock {
                registeredParticles.add(particle)
            }

        override suspend fun unregisterParticle(particle: ParticleIdentifier): Unit =
            hostMutex.withLock {
                registeredParticles.remove(particle)
            }

        override suspend fun registeredParticles() = hostMutex.withLock {
            registeredParticles
        }

        override suspend fun startArc(partition: PlanPartition): Unit = hostMutex.withLock {
            startArcCalls.add(partition)
        }

        override suspend fun stopArc(partition: PlanPartition): Unit = hostMutex.withLock {
            stopArcCalls.add(partition)
        }
    }

    @Before
    fun setUp() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        service = Robolectric.setupService(TestAndroidArcHostService::class.java)
        arcHost = TestArcHost()
        helper = ArcHostHelper(service, arcHost)
    }

    @Test
    fun onStartCommand_doesNotCallOnStartArc_when_intentIsNull() = runBlockingTest {
        helper.onStartCommand(null)
        assertThat(arcHost.startCalls()).isEmpty()
    }

    @Test
    fun onStartCommand_doesNotCallOnStartArc_when_intentActionIsNull() = runBlockingTest {
        helper.onStartCommand(Intent())
        assertThat(arcHost.startCalls()).isEmpty()
    }

    @Test
    fun onStartCommand_doesNotCallOnStartArc_when_intentActionDoesNotMatch() = runBlockingTest {
        helper.onStartCommand(Intent().apply { action = "Incorrect" })
        assertThat(arcHost.startCalls()).isEmpty()
    }

    @Test
    fun onStartCommand_doesNotCallOnStartArc_when_Operation_isMissing() = runBlockingTest {
        helper.onStartCommand(Intent().apply { action = ArcHostHelper.ARC_HOST_INTENT })
        assertThat(arcHost.startCalls()).isEmpty()
    }

    @Test
    fun onStartCommand_callsOnStartArcStopArc_whenStarsAlign() = runBlockingTest {
        val personSchema = Schema(
            listOf(SchemaName("Person")),
            SchemaFields(setOf("name"), emptySet()),
            SchemaDescription()
        )

        val handleSpec = HandleSpec("foo", "bar", null, mutableSetOf(), personSchema)
        val particleSpec = ParticleSpec("FooParticle", "foo.bar.FooParticle")
        val connectionSpec = HandleConnectionSpec("foo", handleSpec, particleSpec)

        val planPartition = PlanPartition("id", "FooHost", listOf(connectionSpec))
        val startIntent = planPartition.createStartArcHostIntent(
            TestAndroidArcHostService::class.toComponentName(context)
        )
        val stopIntent = planPartition.createStopArcHostIntent(
            TestAndroidArcHostService::class.toComponentName(context)
        )
        helper.onStartCommandSuspendable(startIntent)
        assertThat(arcHost.startCalls()).containsExactly(planPartition)

        helper.onStartCommandSuspendable(stopIntent)
        assertThat(arcHost.stopCalls()).containsExactly(planPartition)
    }

    @Test
    fun onStartCommand_callsRegisterUnregisterAndGetParticles() = runBlocking {
        val particleIdentifier = ParticleIdentifier("foo.bar", "Baz")
        val particleIdentifier2 = ParticleIdentifier("foo.bar", "Baz2")

        val registerIntent = particleIdentifier.createRegisterParticleIntent(
            TestAndroidArcHostService::class.toComponentName(context)
        )
        val registerIntent2 = particleIdentifier2.createRegisterParticleIntent(
            TestAndroidArcHostService::class.toComponentName(context)
        )
        val unregisterIntent = particleIdentifier.createUnregisterParticleIntent(
            TestAndroidArcHostService::class.toComponentName(context)
        )
        val unregisterIntent2 = particleIdentifier2.createUnregisterParticleIntent(
            TestAndroidArcHostService::class.toComponentName(context)
        )

        helper.onStartCommandSuspendable(registerIntent)
        helper.onStartCommandSuspendable(registerIntent2)
        assertThat(arcHost.particles().toSet()).containsExactly(
            particleIdentifier, particleIdentifier2
        )

        val getParticlesIntent = TestAndroidArcHostService::class.toComponentName(context)
            .createGetRegisteredParticlesIntent()

        // Wait for async result
        suspendCancellableCoroutine<List<ParticleIdentifier>?> { coroutine ->
            ArcHostHelper
                .onResult(getParticlesIntent, object : ResultReceiver(Handler()) {
                    override fun onReceiveResult(resultCode: Int, resultData: Bundle?) {
                        val particles = ArcHostHelper.getParticleIdentifierListResult(resultData)

                        assertThat(particles).containsExactly(
                            particleIdentifier, particleIdentifier2
                        )
                        coroutine.resume(particles, { throwable -> throw throwable })
                    }
                })
            helper.onStartCommand(getParticlesIntent)
        }

        helper.onStartCommandSuspendable(unregisterIntent)
        helper.onStartCommandSuspendable(unregisterIntent2)

        assertThat(arcHost.particles()).isEmpty()
    }
}
