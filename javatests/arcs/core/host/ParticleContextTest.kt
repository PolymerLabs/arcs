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
import arcs.core.entity.Handle
import arcs.core.host.api.HandleHolder
import arcs.core.host.api.Particle
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.testutil.assertSuspendingThrows
import arcs.core.testutil.runTest
import arcs.core.util.Scheduler
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.inOrder
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.only
import com.nhaarman.mockitokotlin2.times
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import com.nhaarman.mockitokotlin2.whenever
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Before
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.MockitoAnnotations

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ParticleContextTest {

    @Mock
    lateinit var particle: Particle
    @Mock
    lateinit var handles: HandleHolder
    @Mock
    lateinit var notifyReady: (Particle) -> Unit
    @Mock
    lateinit var mark: (String) -> Unit
    lateinit var context: ParticleContext

    @Before
    fun setup() {
        MockitoAnnotations.initMocks(this)
        whenever(particle.handles).thenReturn(handles)
        context = ParticleContext(
            particle,
            Plan.Particle("name", "location", mapOf()),
            Scheduler(EmptyCoroutineContext)
        )
    }

    @Ignore("b/159257058: write-only handles still need to sync")
    @Test
    fun fullLifecycle_writeOnlyParticle() = runTest {
        val handle = mockHandle(HandleMode.Write)

        mark("initParticle")
        context.initParticle()
        assertThat(context.particleState).isEqualTo(ParticleState.Waiting)

        mark("registerHandle")
        context.registerHandle(handle)
        assertThat(context.particleState).isEqualTo(ParticleState.Waiting)

        mark("runParticle")
        context.runParticle(notifyReady)
        assertThat(context.particleState).isEqualTo(ParticleState.Running)

        mark("stopParticle")
        context.stopParticle()
        assertThat(context.particleState).isEqualTo(ParticleState.Stopped)

        val mocks = arrayOf(particle, notifyReady, mark, handles, handle)
        with(inOrder(*mocks)) {
            verify(mark).invoke("initParticle")
            verify(particle).onFirstStart()
            verify(particle).onStart()

            verify(mark).invoke("registerHandle")
            verify(handle).mode

            verify(mark).invoke("runParticle")
            verify(particle).onReady()
            verify(notifyReady).invoke(particle)

            verify(mark).invoke("stopParticle")
            verify(particle).onShutdown()
            verify(particle).handles
            verify(handles).reset()
        }
        verifyNoMoreInteractions(*mocks)
    }

    @Test
    fun fullLifecycle_readingParticle() = runTest {
        val handle = mockHandle(HandleMode.ReadWrite)

        mark("initParticle")
        context.initParticle()
        assertThat(context.particleState).isEqualTo(ParticleState.Waiting)

        mark("registerHandle")
        context.registerHandle(handle)
        assertThat(context.particleState).isEqualTo(ParticleState.Waiting)

        mark("runParticle")
        context.runParticle(notifyReady)
        assertThat(context.particleState).isEqualTo(ParticleState.Waiting)

        mark("notify(READY)")
        context.notify(StorageEvent.READY, handle)
        assertThat(context.particleState).isEqualTo(ParticleState.Running)

        mark("stopParticle")
        context.stopParticle()
        assertThat(context.particleState).isEqualTo(ParticleState.Stopped)

        val mocks = arrayOf(particle, notifyReady, mark, handles, handle)
        with(inOrder(*mocks)) {
            verify(mark).invoke("initParticle")
            verify(particle).onFirstStart()
            verify(particle).onStart()

            verify(mark).invoke("registerHandle")
            verify(handle).mode
            verify(handle).registerForStorageEvents(any())

            verify(mark).invoke("runParticle")
            verify(handle).maybeInitiateSync()

            verify(mark).invoke("notify(READY)")
            verify(particle).onReady()
            verify(notifyReady).invoke(particle)

            verify(mark).invoke("stopParticle")
            verify(particle).onShutdown()
            verify(particle).handles
            verify(handles).reset()
        }
        verifyNoMoreInteractions(*mocks)
    }

    @Test
    fun initParticle_secondInstantiation() = runTest {
        context.particleState = ParticleState.Stopped
        context.initParticle()
        verify(particle, only()).onStart()
        assertThat(context.particleState).isEqualTo(ParticleState.Waiting)
    }

    @Test
    fun storageEvents() = runTest {
        context.initParticle()
        val handle1 = mockHandle(HandleMode.Write).also { context.registerHandle(it) }
        val handle2 = mockHandle(HandleMode.ReadWrite).also { context.registerHandle(it) }
        val handle3 = mockHandle(HandleMode.Read).also { context.registerHandle(it) }
        val handle4 = mockHandle(HandleMode.ReadWrite).also { context.registerHandle(it) }
        context.runParticle(notifyReady)
        verify(particle).onFirstStart()
        verify(particle).onStart()
        // TODO(b/159257058): write-only handles still need to sync
        arrayOf(handle1, handle2, handle3, handle4).forEach {
            verify(it).mode
            verify(it).registerForStorageEvents(any())
            verify(it).maybeInitiateSync()
        }

        // All handle.onReady calls are required for particle.onReady
        context.notify(StorageEvent.READY, handle1) // TODO(b/159257058)
        context.notify(StorageEvent.READY, handle2)
        assertThat(context.particleState).isEqualTo(ParticleState.Waiting)
        context.notify(StorageEvent.READY, handle3)
        assertThat(context.particleState).isEqualTo(ParticleState.Waiting)
        mark("ready")
        context.notify(StorageEvent.READY, handle4)
        assertThat(context.particleState).isEqualTo(ParticleState.Running)

        // Every handle.onUpdate triggers particle.onUpdate
        mark("update")
        context.notify(StorageEvent.UPDATE, handle2)
        context.notify(StorageEvent.UPDATE, handle3)
        context.notify(StorageEvent.UPDATE, handle4)

        // Only the first handle.onDesync triggers particle.onDesync
        // All handle.onResyncs are required for particle.onResync
        mark("desync1")
        context.notify(StorageEvent.DESYNC, handle2) // h2 desynced
        assertThat(context.particleState).isEqualTo(ParticleState.Desynced)

        context.notify(StorageEvent.DESYNC, handle3) // h2, h3 desynced
        context.notify(StorageEvent.RESYNC, handle2) // h3 desynced
        context.notify(StorageEvent.DESYNC, handle4) // h3, h4 desynced
        context.notify(StorageEvent.RESYNC, handle4) // h3 desynced
        assertThat(context.particleState).isEqualTo(ParticleState.Desynced)

        mark("desync2")
        context.notify(StorageEvent.RESYNC, handle3) // all resynced
        assertThat(context.particleState).isEqualTo(ParticleState.Running)

        val mocks = arrayOf(particle, mark, handle1, handle2, handle3, handle4)
        with(inOrder(*mocks)) {
            verify(mark).invoke("ready")
            verify(particle).onReady()

            verify(mark).invoke("update")
            verify(particle, times(3)).onUpdate()

            verify(mark).invoke("desync1")
            verify(particle).onDesync()
            verify(mark).invoke("desync2")
            verify(particle).onResync()
        }
        verifyNoMoreInteractions(*mocks)
    }

    @Test
    fun errors_onFirstStart_firstInstantiation() = runTest {
        whenever(particle.onFirstStart()).thenThrow(RuntimeException("boom"))

        assertSuspendingThrows(RuntimeException::class) { context.initParticle() }
        verify(particle, only()).onFirstStart()
        assertThat(context.particleState).isEqualTo(ParticleState.Failed_NeverStarted)
        assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")
    }

    @Test
    fun errors_onStart_secondInstantiation() = runTest {
        whenever(particle.onStart()).thenThrow(RuntimeException("boom"))

        assertSuspendingThrows(RuntimeException::class) { context.initParticle() }
        with(inOrder(particle)) {
            verify(particle).onFirstStart()
            verify(particle).onStart()
        }
        verifyNoMoreInteractions(particle, handles)
        assertThat(context.particleState).isEqualTo(ParticleState.Failed)
        assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")
    }

    @Test
    fun errors_onReady_runParticle() = runTest {
        whenever(particle.onReady()).thenThrow(RuntimeException("boom"))
        context.initParticle()

        assertSuspendingThrows(RuntimeException::class) { context.runParticle(notifyReady) }
        with(inOrder(particle)) {
            verify(particle).onFirstStart()
            verify(particle).onStart()
            verify(particle).onReady()
        }
        verifyNoMoreInteractions(particle, handles)
        assertThat(context.particleState).isEqualTo(ParticleState.Failed)
        assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")
    }

    // TODO(b/158790341): test errors in StorageEvent-driven methods

    @Test
    fun errors_onShutdown() = runTest {
        whenever(particle.onShutdown()).thenThrow(RuntimeException("boom"))
        context.initParticle()
        context.runParticle(notifyReady)

        // stopParticle doesn't throw but still marks the particle as failed
        context.stopParticle()
        with(inOrder(particle, handles)) {
            verify(particle).onFirstStart()
            verify(particle).onStart()
            verify(particle).onReady()
            verify(particle).onShutdown()
            verify(particle).handles
            verify(handles).reset()
        }
        verifyNoMoreInteractions(particle, handles)
        assertThat(context.particleState).isEqualTo(ParticleState.Failed)
        assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")
    }

    @Test
    fun errors_crashLoopingParticle() = runTest {
        whenever(particle.onStart()).thenThrow(RuntimeException("boom"))

        for (i in 1..MAX_CONSECUTIVE_FAILURES) {
            assertSuspendingThrows(RuntimeException::class) { context.initParticle() }
            assertThat(context.consecutiveFailureCount).isEqualTo(i)
        }
        assertThat(context.particleState).isEqualTo(ParticleState.Failed)
        assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")

        assertSuspendingThrows(RuntimeException::class) { context.initParticle() }
        assertThat(context.particleState).isEqualTo(ParticleState.MaxFailed)
        assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")
    }

    private fun mockHandle(handleMode: HandleMode) =
        mock<Handle> { on { mode }.thenReturn(handleMode) }
}
