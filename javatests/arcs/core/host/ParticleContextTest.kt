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
import arcs.core.host.ParticleState.Companion.Desynced
import arcs.core.host.ParticleState.Companion.Failed
import arcs.core.host.ParticleState.Companion.Failed_NeverStarted
import arcs.core.host.ParticleState.Companion.FirstStart
import arcs.core.host.ParticleState.Companion.Instantiated
import arcs.core.host.ParticleState.Companion.MaxFailed
import arcs.core.host.ParticleState.Companion.Running
import arcs.core.host.ParticleState.Companion.Stopped
import arcs.core.host.ParticleState.Companion.Waiting
import arcs.core.host.api.HandleHolder
import arcs.core.host.api.Particle
import arcs.core.storage.StorageProxy.StorageEvent
import arcs.core.testutil.runTest
import arcs.core.util.Scheduler
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.argumentCaptor
import com.nhaarman.mockitokotlin2.inOrder
import com.nhaarman.mockitokotlin2.mock
import com.nhaarman.mockitokotlin2.never
import com.nhaarman.mockitokotlin2.only
import com.nhaarman.mockitokotlin2.times
import com.nhaarman.mockitokotlin2.verify
import com.nhaarman.mockitokotlin2.verifyNoMoreInteractions
import com.nhaarman.mockitokotlin2.whenever
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.test.assertFailsWith
import org.junit.Before
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.MockitoAnnotations

@RunWith(JUnit4::class)
class ParticleContextTest {
  @get:Rule
  val log = LogRule()

  @Mock
  lateinit var particle: Particle

  @Mock
  lateinit var handles: HandleHolder

  @Mock
  lateinit var mark: (String) -> Unit
  lateinit var context: ParticleContext

  val scheduler = Scheduler(EmptyCoroutineContext)

  @Before
  fun setup() {
    MockitoAnnotations.initMocks(this)
    whenever(particle.handles).thenReturn(handles)
    context = ParticleContext(
      particle,
      Plan.Particle("name", "location", mapOf())
    )
  }

  @Ignore("b/159257058: write-only handles still need to sync")
  @Test
  fun fullLifecycle_writeOnlyParticle() = runTest {
    val handle = mockHandle(HandleMode.Write)

    mark("initParticle")
    context.initParticle(scheduler)
    assertThat(context.particleState).isEqualTo(Waiting)

    mark("registerHandle")
    context.registerHandle(handle)
    assertThat(context.particleState).isEqualTo(Waiting)

    mark("runParticleAsync")
    context.runParticleAsync(scheduler).await()
    assertThat(context.particleState).isEqualTo(Running)

    mark("stopParticle")
    context.stopParticle(scheduler)
    assertThat(context.particleState).isEqualTo(Stopped)

    val mocks = arrayOf(particle, mark, handles, handle)
    with(inOrder(*mocks)) {
      verify(mark).invoke("initParticle")
      verify(particle).onFirstStart()
      verify(particle).onStart()

      verify(mark).invoke("registerHandle")
      verify(handle).mode

      verify(mark).invoke("runParticle")
      verify(particle).onReady()

      verify(mark).invoke("stopParticle")
      verify(handles).detach()
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
    context.initParticle(scheduler)
    assertThat(context.particleState).isEqualTo(Waiting)

    mark("registerHandle")
    context.registerHandle(handle)
    assertThat(context.particleState).isEqualTo(Waiting)

    mark("runParticle")
    val particleReady = context.runParticleAsync(scheduler)
    assertThat(context.particleState).isEqualTo(Waiting)

    mark("notify(READY)")
    context.notify(StorageEvent.READY, handle)
    particleReady.await()
    assertThat(context.particleState).isEqualTo(Running)

    mark("stopParticle")
    context.stopParticle(scheduler)
    assertThat(context.particleState).isEqualTo(Stopped)

    val mocks = arrayOf(particle, mark, handles, handle)
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

      verify(mark).invoke("stopParticle")
      verify(particle).handles
      verify(handles).detach()
      verify(particle).onShutdown()
      verify(particle).handles
      verify(handles).reset()
    }
    verifyNoMoreInteractions(*mocks)
  }

  @Test
  fun initParticle_secondInstantiation() = runTest {
    context.particleState = Stopped
    context.initParticle(scheduler)
    verify(particle, only()).onStart()
    assertThat(context.particleState).isEqualTo(Waiting)
  }

  @Test
  fun storageEvents() = runTest {
    context.initParticle(scheduler)
    val handle1 = mockHandle(HandleMode.Write).also { context.registerHandle(it) }
    val handle2 = mockHandle(HandleMode.ReadWrite).also { context.registerHandle(it) }
    val handle3 = mockHandle(HandleMode.Read).also { context.registerHandle(it) }
    val handle4 = mockHandle(HandleMode.ReadWrite).also { context.registerHandle(it) }
    val particleReady = context.runParticleAsync(scheduler)
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
    assertThat(context.particleState).isEqualTo(Waiting)
    context.notify(StorageEvent.READY, handle3)
    assertThat(context.particleState).isEqualTo(Waiting)
    mark("ready")
    context.notify(StorageEvent.READY, handle4)
    particleReady.await()
    assertThat(context.particleState).isEqualTo(Running)

    // Every handle.onUpdate triggers particle.onUpdate
    mark("update")
    context.notify(StorageEvent.UPDATE, handle2)
    context.notify(StorageEvent.UPDATE, handle3)
    context.notify(StorageEvent.UPDATE, handle4)

    // Only the first handle.onDesync triggers particle.onDesync
    // All handle.onResyncs are required for particle.onResync
    mark("desync1")
    context.notify(StorageEvent.DESYNC, handle2) // h2 desynced
    assertThat(context.particleState).isEqualTo(Desynced)

    context.notify(StorageEvent.DESYNC, handle3) // h2, h3 desynced
    context.notify(StorageEvent.RESYNC, handle2) // h3 desynced
    context.notify(StorageEvent.DESYNC, handle4) // h3, h4 desynced
    context.notify(StorageEvent.RESYNC, handle4) // h3 desynced
    assertThat(context.particleState).isEqualTo(Desynced)

    mark("desync2")
    context.notify(StorageEvent.RESYNC, handle3) // all resynced
    assertThat(context.particleState).isEqualTo(Running)

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

    assertFailsWith<RuntimeException> { context.initParticle(scheduler) }
    verify(particle, only()).onFirstStart()
    assertThat(context.particleState).isEqualTo(Failed_NeverStarted)
    assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")
  }

  @Test
  fun errors_onStart_secondInstantiation() = runTest {
    whenever(particle.onStart()).thenThrow(RuntimeException("boom"))

    assertFailsWith<RuntimeException> { context.initParticle(scheduler) }
    with(inOrder(particle)) {
      verify(particle).onFirstStart()
      verify(particle).onStart()
    }
    verifyNoMoreInteractions(particle, handles)
    assertThat(context.particleState).isEqualTo(Failed)
    assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")
  }

  @Test
  fun errors_onReady_runParticle() = runTest {
    whenever(particle.onReady()).thenThrow(RuntimeException("boom"))
    context.initParticle(scheduler)

    val deferred = context.runParticleAsync(scheduler)
    assertFailsWith<RuntimeException> {
      deferred.await()
    }
    with(inOrder(particle)) {
      verify(particle).onFirstStart()
      verify(particle).onStart()
      verify(particle).onReady()
    }
    verifyNoMoreInteractions(particle, handles)
    assertThat(context.particleState).isEqualTo(Failed)
    assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")
  }

  @Test
  fun errors_storageEventTriggered() = runTest {
    val handle = mockHandle(HandleMode.ReadWrite)
    val error = RuntimeException("boom")

    context.particleState = Running
    whenever(particle.onUpdate()).thenThrow(error)
    mock<(Exception) -> Unit>().let {
      context.notify(StorageEvent.UPDATE, handle, it)
      verify(it).invoke(error)
    }
    assertThat(context.particleState).isEqualTo(Failed)
    assertThat(context.particleState.cause).isEqualTo(error)

    context.particleState = Running
    whenever(particle.onDesync()).thenThrow(error)
    mock<(Exception) -> Unit>().let {
      context.notify(StorageEvent.DESYNC, handle, it)
      verify(it).invoke(error)
    }
    assertThat(context.particleState).isEqualTo(Failed)
    assertThat(context.particleState.cause).isEqualTo(error)

    context.particleState = Desynced
    whenever(particle.onResync()).thenThrow(error)
    mock<(Exception) -> Unit>().let {
      context.notify(StorageEvent.RESYNC, handle, it)
      verify(it).invoke(error)
    }
    assertThat(context.particleState).isEqualTo(Failed)
    assertThat(context.particleState.cause).isEqualTo(error)
  }

  @Test
  fun errors_onShutdown() = runTest {
    whenever(particle.onShutdown()).thenThrow(RuntimeException("boom"))
    context.initParticle(scheduler)
    context.runParticleAsync(scheduler).await()

    // stopParticle doesn't throw but still marks the particle as failed
    context.stopParticle(scheduler)
    with(inOrder(particle, handles)) {
      verify(particle).onFirstStart()
      verify(particle).onStart()
      verify(particle).onReady()
      verify(particle).handles
      verify(handles).detach()
      verify(particle).onShutdown()
      verify(particle).handles
      verify(handles).reset()
    }
    verifyNoMoreInteractions(particle, handles)
    assertThat(context.particleState).isEqualTo(Failed)
    assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")
  }

  @Test
  fun errors_crashLoopingParticle() = runTest {
    whenever(particle.onStart()).thenThrow(RuntimeException("boom"))

    for (i in 1..MAX_CONSECUTIVE_FAILURES) {
      assertFailsWith<RuntimeException> { context.initParticle(scheduler) }
      assertThat(context.consecutiveFailureCount).isEqualTo(i)
    }
    assertThat(context.particleState).isEqualTo(Failed)
    assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")

    assertFailsWith<RuntimeException> { context.initParticle(scheduler) }
    assertThat(context.particleState).isEqualTo(MaxFailed)
    assertThat(context.particleState.cause).hasMessageThat().isEqualTo("boom")
  }

  @Test
  fun copyWith() {
    val originalParticle = mock<Particle>()
    val planParticle = Plan.Particle("PlanParticle", "location", emptyMap())
    val newParticle = mock<Particle>()
    val originalContext = ParticleContext(
      particle = originalParticle,
      planParticle = planParticle,
      particleState = Running,
      consecutiveFailureCount = 0
    )

    val copiedContext = originalContext.copyWith(newParticle)

    assertThat(copiedContext.particle).isSameInstanceAs(newParticle)
    assertThat(copiedContext.planParticle).isSameInstanceAs(planParticle)
    assertThat(copiedContext.particleState).isEqualTo(Running)
    assertThat(copiedContext.consecutiveFailureCount).isEqualTo(0)
  }

  @Test
  fun toString_rendersImportantPieces() {
    assertThat(context.toString()).contains("particle=")
    assertThat(context.toString()).contains("particleState=")
    assertThat(context.toString()).contains("consecutiveFailureCount=")
    assertThat(context.toString()).contains("awaitingReady=")
  }

  @Test
  fun registerHandle_readWrite_notifiesOnFirstReady() = runTest {
    val handle = mockHandle(HandleMode.ReadWrite)
    val captor = argumentCaptor<(StorageEvent) -> Unit>()
    whenever(handle.registerForStorageEvents(captor.capture())).then { }

    context.registerHandle(handle)
    context.initParticle(scheduler)
    val capturedRegistration = captor.firstValue

    capturedRegistration(StorageEvent.READY)
    capturedRegistration(StorageEvent.READY)

    // Only one of the READY events should make it to the particle.
    verify(particle).onReady()
  }

  @Test
  fun registerHandle_readWrite_notifiesOnFirstDesync() = runTest {
    val handle = mockHandle(HandleMode.ReadWrite)
    val captor = argumentCaptor<(StorageEvent) -> Unit>()
    whenever(handle.registerForStorageEvents(captor.capture())).then { }

    context.registerHandle(handle)
    context.initParticle(scheduler)
    val capturedRegistration = captor.firstValue

    capturedRegistration(StorageEvent.DESYNC)
    capturedRegistration(StorageEvent.DESYNC)

    // Only one of the DESYNC events should make it to the particle.
    verify(particle).onDesync()
  }

  @Test
  fun registerHandle_readWrite_notifiesOnAnyResync() = runTest {
    val handle = mockHandle(HandleMode.ReadWrite)
    val captor = argumentCaptor<(StorageEvent) -> Unit>()
    whenever(handle.registerForStorageEvents(captor.capture())).then { }

    context.registerHandle(handle)
    context.initParticle(scheduler)
    val capturedRegistration = captor.firstValue

    capturedRegistration(StorageEvent.RESYNC)
    capturedRegistration(StorageEvent.RESYNC)

    // Any resync event should make it through.
    verify(particle, times(2)).onResync()
  }

  @Test
  fun registerHandle_writeOnly_onlyNotifiesOnReady() = runTest {
    val handle = mockHandle(HandleMode.Write)
    val captor = argumentCaptor<(StorageEvent) -> Unit>()
    whenever(handle.registerForStorageEvents(captor.capture())).then { }

    context.registerHandle(handle)
    context.initParticle(scheduler)
    val capturedRegistration = captor.firstValue

    capturedRegistration(StorageEvent.READY)
    capturedRegistration(StorageEvent.DESYNC)
    capturedRegistration(StorageEvent.RESYNC)
    capturedRegistration(StorageEvent.UPDATE)

    // Any resync event should make it through.
    verify(particle).onReady()
    verify(particle, never()).onDesync()
    verify(particle, never()).onResync()
    verify(particle, never()).onUpdate()
  }

  @Test
  fun initParticle_whenFirstStart_throws() = runTest {
    val context = createParticleContext(particleState = FirstStart)

    val e = assertFailsWith<IllegalStateException> { context.initParticle(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("initParticle should not be called on a particle in state $FirstStart")
  }

  @Test
  fun initParticle_whenWaiting_throws() = runTest {
    val context = createParticleContext(particleState = Waiting)

    val e = assertFailsWith<IllegalStateException> { context.initParticle(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("initParticle should not be called on a particle in state $Waiting")
  }

  @Test
  fun initParticle_whenRunning_throws() = runTest {
    val context = createParticleContext(particleState = Running)

    val e = assertFailsWith<IllegalStateException> { context.initParticle(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("initParticle should not be called on a particle in state $Running")
  }

  @Test
  fun initParticle_whenDesynced_throws() = runTest {
    val context = createParticleContext(particleState = Desynced)

    val e = assertFailsWith<IllegalStateException> { context.initParticle(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("initParticle should not be called on a particle in state $Desynced")
  }

  @Test
  fun initParticle_whenMaxFailed_throws() = runTest {
    val context = createParticleContext(particleState = MaxFailed)

    val e = assertFailsWith<IllegalStateException> { context.initParticle(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("initParticle should not be called on a particle in state $MaxFailed")
  }

  @Test
  fun notify_whenInstantiated_throws() = runTest {
    val context = createParticleContext(particleState = Instantiated)

    val e = assertFailsWith<IllegalStateException> {
      context.notify(StorageEvent.READY, mockHandle(HandleMode.ReadWrite))
    }
    assertThat(e).hasMessageThat()
      .contains("storage events should not be received in state $Instantiated")
  }

  @Test
  fun notify_whenFirstStart_throws() = runTest {
    val context = createParticleContext(particleState = FirstStart)

    val e = assertFailsWith<IllegalStateException> {
      context.notify(StorageEvent.READY, mockHandle(HandleMode.ReadWrite))
    }
    assertThat(e).hasMessageThat()
      .contains("storage events should not be received in state $FirstStart")
  }

  @Test
  fun notify_whenStopped_throws() = runTest {
    val context = createParticleContext(particleState = Stopped)

    val e = assertFailsWith<IllegalStateException> {
      context.notify(StorageEvent.READY, mockHandle(HandleMode.ReadWrite))
    }
    assertThat(e).hasMessageThat()
      .contains("storage events should not be received in state $Stopped")
  }

  @Test
  fun notify_whenFailed_throws() = runTest {
    val context = createParticleContext(particleState = Failed)

    val e = assertFailsWith<IllegalStateException> {
      context.notify(StorageEvent.READY, mockHandle(HandleMode.ReadWrite))
    }
    assertThat(e).hasMessageThat()
      .contains("storage events should not be received in state $Failed")
  }

  @Test
  fun notify_whenFailedNeverStarted_throws() = runTest {
    val context = createParticleContext(particleState = Failed_NeverStarted)

    val e = assertFailsWith<IllegalStateException> {
      context.notify(StorageEvent.READY, mockHandle(HandleMode.ReadWrite))
    }
    assertThat(e).hasMessageThat()
      .contains("storage events should not be received in state $Failed_NeverStarted")
  }

  @Test
  fun notify_whenMaxFailed_throws() = runTest {
    val context = createParticleContext(particleState = MaxFailed)

    val e = assertFailsWith<IllegalStateException> {
      context.notify(StorageEvent.READY, mockHandle(HandleMode.ReadWrite))
    }
    assertThat(e).hasMessageThat()
      .contains("storage events should not be received in state $MaxFailed")
  }

  @Suppress("DeferredResultUnused")
  @Test
  fun runParticleAsync_whenRunningAndAwaitingReadyFromAHandle_throws() = runTest {
    val context = createParticleContext(particleState = Running)
    context.registerHandle(mockHandle(HandleMode.ReadWrite))

    val e = assertFailsWith<IllegalStateException> { context.runParticleAsync(scheduler) }
    assertThat(e).hasMessageThat()
      .contains(
        "runParticleAsync called on an already running particle; awaitingReady should be empty " +
          "but still has 1 handles"
      )
  }

  @Test
  fun runParticleAsync_whenRunningAndHandlesReady_returnsCompletedDeferred() = runTest {
    val context = createParticleContext(particleState = Running)

    val actualDeferred = context.runParticleAsync(scheduler)
    assertThat(actualDeferred.isCompleted).isTrue()
  }

  @Suppress("DeferredResultUnused")
  @Test
  fun runParticleAsync_calledMoreThanOnceWhenWaiting_throws() = runTest {
    val context = createParticleContext(particleState = Waiting)
    context.registerHandle(mockHandle(HandleMode.ReadWrite))

    // First call should be okay.
    context.runParticleAsync(scheduler)
    // Second call should fail.
    val e = assertFailsWith<IllegalStateException> { context.runParticleAsync(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("runParticleAsync called more than once on a waiting particle")
  }

  @Suppress("DeferredResultUnused")
  @Test
  fun runParticleAsync_whenInstantiated_throws() = runTest {
    val context = createParticleContext(particleState = Instantiated)

    val e = assertFailsWith<IllegalStateException> { context.runParticleAsync(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("runParticleAsync should not be called on a particle in state $Instantiated")
  }

  @Suppress("DeferredResultUnused")
  @Test
  fun runParticleAsync_whenFirstStart_throws() = runTest {
    val context = createParticleContext(particleState = FirstStart)

    val e = assertFailsWith<IllegalStateException> { context.runParticleAsync(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("runParticleAsync should not be called on a particle in state $FirstStart")
  }

  @Suppress("DeferredResultUnused")
  @Test
  fun runParticleAsync_whenDesynced_throws() = runTest {
    val context = createParticleContext(particleState = Desynced)

    val e = assertFailsWith<IllegalStateException> { context.runParticleAsync(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("runParticleAsync should not be called on a particle in state $Desynced")
  }

  @Suppress("DeferredResultUnused")
  @Test
  fun runParticleAsync_whenStopped_throws() = runTest {
    val context = createParticleContext(particleState = Stopped)

    val e = assertFailsWith<IllegalStateException> { context.runParticleAsync(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("runParticleAsync should not be called on a particle in state $Stopped")
  }

  @Suppress("DeferredResultUnused")
  @Test
  fun runParticleAsync_whenFailed_throws() = runTest {
    val context = createParticleContext(particleState = Failed)

    val e = assertFailsWith<IllegalStateException> { context.runParticleAsync(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("runParticleAsync should not be called on a particle in state $Failed")
  }

  @Suppress("DeferredResultUnused")
  @Test
  fun runParticleAsync_whenFailedNeverStarted_throws() = runTest {
    val context = createParticleContext(particleState = Failed_NeverStarted)

    val e = assertFailsWith<IllegalStateException> { context.runParticleAsync(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("runParticleAsync should not be called on a particle in state $Failed_NeverStarted")
  }

  @Suppress("DeferredResultUnused")
  @Test
  fun runParticleAsync_whenMaxFailed_throws() = runTest {
    val context = createParticleContext(particleState = MaxFailed)

    val e = assertFailsWith<IllegalStateException> { context.runParticleAsync(scheduler) }
    assertThat(e).hasMessageThat()
      .contains("runParticleAsync should not be called on a particle in state $MaxFailed")
  }

  private fun mockHandle(handleMode: HandleMode) =
    mock<Handle> { on { mode }.thenReturn(handleMode) }

  private fun createParticleContext(
    particle: Particle = this.particle,
    planParticle: Plan.Particle = Plan.Particle("name", "location", mapOf()),
    particleState: ParticleState = Instantiated
  ): ParticleContext = ParticleContext(particle, planParticle, particleState)
}
