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
import arcs.android.sdk.host.createLookupArcStatusIntent
import arcs.android.sdk.host.createPauseArcHostIntent
import arcs.android.sdk.host.createStartArcHostIntent
import arcs.android.sdk.host.createStopArcHostIntent
import arcs.android.sdk.host.createUnpauseArcHostIntent
import arcs.android.sdk.host.toComponentName
import arcs.core.common.ArcId
import arcs.core.data.EntityType
import arcs.core.data.FieldType.Companion.Text
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.host.ArcHost
import arcs.core.data.HandleMode
import arcs.core.host.ArcHostException
import arcs.core.host.ArcState
import arcs.core.host.ArcStateChangeCallback
import arcs.core.host.ArcStateChangeRegistration
import arcs.core.host.ParticleIdentifier
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.util.guardedBy
import com.google.common.truth.Truth.assertThat
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric

@RunWith(AndroidJUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ArcHostHelperTest {
    private lateinit var context: Context
    private lateinit var helper: ArcHostHelper
    private lateinit var service: TestAndroidArcHostService
    private lateinit var arcHost: TestArcHost

    val personSchema = Schema(
        setOf(SchemaName("Person")),
        SchemaFields(mapOf("name" to Text), emptyMap()),
        "42"
    )

    val connection = Plan.HandleConnection(
        VolatileStorageKey(ArcId.newForTest("foo"), "bar"),
        HandleMode.ReadWrite,
        EntityType(personSchema)
    )

    val particleSpec = Plan.Particle(
        "FooParticle",
        "foo.bar.FooParticle",
        mapOf("foo" to connection)
    )

    val planPartition = Plan.Partition("id", "FooHost", listOf(particleSpec))

    open class TestArcHost : ArcHost {
        private val hostMutex = Mutex()

        var startArcCalls: MutableList<Plan.Partition> by guardedBy(hostMutex, mutableListOf())
        var stopArcCalls: MutableList<Plan.Partition> by guardedBy(hostMutex, mutableListOf())
        var registeredParticles: MutableList<ParticleIdentifier> by guardedBy(
            hostMutex, mutableListOf()
        )
        var paused = false

        suspend fun startCalls() = hostMutex.withLock { startArcCalls }
        suspend fun stopCalls() = hostMutex.withLock { stopArcCalls }
        suspend fun particles() = hostMutex.withLock { registeredParticles }

        override val hostId = this::class.java.canonicalName!!

        override suspend fun registeredParticles() = hostMutex.withLock {
            registeredParticles
        }

        override suspend fun startArc(partition: Plan.Partition): Unit = hostMutex.withLock {
            startArcCalls.add(partition)
            if (throws) {
                throw IllegalArgumentException("Boom!")
            }
        }

        override suspend fun pause() {
            paused = true
        }

        override suspend fun unpause() {
            paused = false
        }

        override suspend fun addOnArcStateChange(
            arcId: ArcId, block: ArcStateChangeCallback
        ): ArcStateChangeRegistration {
            TODO("Not yet implemented")
        }

        override suspend fun stopArc(partition: Plan.Partition): Unit = hostMutex.withLock {
            stopArcCalls.add(partition)
        }

        override suspend fun lookupArcHostStatus(partition: Plan.Partition): ArcState =
            ArcState.Stopped

        override suspend fun isHostForParticle(particle: Plan.Particle) =
            registeredParticles.contains(ParticleIdentifier.from(particle.location))

        suspend fun registerParticle(particleIdentifier: ParticleIdentifier) =
            hostMutex.withLock { registeredParticles.add(particleIdentifier) }

        companion object {
            var throws = false
        }
    }

    @Before
    fun setUp() {
        TestArcHost.throws = false
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
        helper.onStartCommand(Intent().apply { action = ArcHostHelper.ACTION_HOST_INTENT })
        assertThat(arcHost.startCalls()).isEmpty()
    }

    @Test
    fun onStartCommand_lookupArcHostStatus_returnsValue() = runBlockingTest {
        val lookupIntent = planPartition.createLookupArcStatusIntent(
            TestAndroidArcHostService::class.toComponentName(context),
            arcHost.hostId
        )

        val actual = runWithResult(lookupIntent) { bundle ->
            ArcHostHelper.getStringResult(bundle)
        }
        assertThat(actual).isEqualTo(ArcState.Stopped.toString())
    }

    private fun <T> runWithResult(
        intent: Intent,
        transformer: (Bundle?) -> T
    ): T = runBlocking {
        suspendCoroutine<T> { coroutine ->
            ArcHostHelper.setResultReceiver(
                intent,
                object : ResultReceiver(Handler()) {
                    override fun onReceiveResult(resultCode: Int, resultData: Bundle?) {
                        val state = transformer(resultData)
                        coroutine.resume(state!!)
                    }
                }
            )
            helper.onStartCommand(intent)
        }
    }

    @Test
    fun onStartCommand_callsOnStart_throwsException_returnsException() = runBlockingTest {
        TestArcHost.throws = true
        val startIntent = planPartition.createStartArcHostIntent(
            TestAndroidArcHostService::class.toComponentName(context),
            arcHost.hostId
        )
        val exception = runWithResult(startIntent) { bundle ->
            ArcHostHelper.getExceptionResult(bundle)
        }
        assertThat(exception).isInstanceOf(ArcHostException::class.java)
        assertThat(exception).hasMessageThat().isEqualTo("Boom!")
        assertThat(exception.stackTrace).contains("TestArcHost")
    }

    @Test
    fun onStartCommand_callsOnStartArcStopArc_whenStarsAlign() = runBlockingTest {
        val startIntent = planPartition.createStartArcHostIntent(
            TestAndroidArcHostService::class.toComponentName(context),
            arcHost.hostId
        )
        val stopIntent = planPartition.createStopArcHostIntent(
            TestAndroidArcHostService::class.toComponentName(context),
            arcHost.hostId
        )
        helper.onStartCommandSuspendable(startIntent)
        assertThat(arcHost.startCalls()).containsExactly(planPartition)

        helper.onStartCommandSuspendable(stopIntent)
        assertThat(arcHost.stopCalls()).containsExactly(planPartition)
    }

    @Test
    fun onStartCommand_callsGetParticles() = runBlockingTest {
        val particleIdentifier = ParticleIdentifier("foo.bar.Baz")
        val particleIdentifier2 = ParticleIdentifier("foo.bar.Baz2")

        arcHost.registerParticle(particleIdentifier)
        arcHost.registerParticle(particleIdentifier2)

        val getParticlesIntent = TestAndroidArcHostService::class.toComponentName(context)
            .createGetRegisteredParticlesIntent(arcHost.hostId)

        val particles = runWithResult(getParticlesIntent) { bundle ->
            ArcHostHelper.getParticleIdentifierListResult(bundle)
        }

        assertThat(particles).containsExactly(particleIdentifier, particleIdentifier2)
    }

    @Test
    fun onPauseUnpause() = runBlockingTest {
        val pauseIntent = TestAndroidArcHostService::class.toComponentName(context)
            .createPauseArcHostIntent(arcHost.hostId)
        val unpauseIntent = TestAndroidArcHostService::class.toComponentName(context)
            .createUnpauseArcHostIntent(arcHost.hostId)
        helper.onStartCommandSuspendable(pauseIntent)
        assertThat(arcHost.paused).isTrue()

        helper.onStartCommandSuspendable(unpauseIntent)
        assertThat(arcHost.paused).isFalse()
    }
}
