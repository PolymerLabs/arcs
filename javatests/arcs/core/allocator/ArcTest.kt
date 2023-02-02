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
package arcs.core.allocator

import arcs.core.common.ArcId
import arcs.core.common.toArcId
import arcs.core.data.Plan
import arcs.core.host.ArcState
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import kotlin.test.assertFailsWith
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.SendChannel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.test.TestCoroutineScope
import kotlinx.coroutines.test.runBlockingTest
import kotlinx.coroutines.withTimeout
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("UnsafeCoroutineCrossing")
class ArcTest {
  private lateinit var stateChannel: Channel<ArcState>
  private lateinit var arc: Arc
  private lateinit var arcStateSender: ArcStateSender
  private lateinit var arcController: FakeArcController

  @Test
  fun arcState_initializesTo_neverStarted() = runBlockingTest {
    val arc = createArc(emptyFlow(), FakeArcController())
    assertThat(arc.arcState).isEqualTo(ArcState.NeverStarted)
  }

  @Test
  fun onRunning() = runBlockingTest {
    setUpFields()

    var onRunningCalled = CompletableDeferred<Unit>()
    val onRunningId = arc.onRunning { onRunningCalled.complete(Unit) }

    // Verify that the handler isn't called for a non-running state.
    arcStateSender.send(ArcState.Indeterminate)
    onRunningCalled.assertAwaitTimesOut()

    // Reset the deferred and verify that our handler is called when the running state is reached.
    onRunningCalled = CompletableDeferred()
    arcStateSender.send(ArcState.Running)
    assertThat(onRunningCalled.await()).isNotNull()

    // Now reset the deferred, remove the handler, and verify that it isn't called anymore.
    onRunningCalled = CompletableDeferred()
    arc.removeHandler(onRunningId)
    arcStateSender.send(ArcState.Indeterminate)
    arcStateSender.send(ArcState.Running)
    onRunningCalled.assertAwaitTimesOut()

    // Send a Stopped state and call Arc.stop so that the flow-consuming job is canceled, otherwise
    // runBlockingTest says a job is still alive.
    arcStateSender.send(ArcState.Stopped)
    arc.stop()
  }

  @Test
  fun onStopped() = runBlockingTest {
    setUpFields()

    var onStoppedCalled = CompletableDeferred<Unit>()
    val onStoppedId = arc.onStopped { onStoppedCalled.complete(Unit) }

    // Verify that the handler isn't called for a non-stopped state.
    arcStateSender.send(ArcState.Indeterminate)
    onStoppedCalled.assertAwaitTimesOut()

    // Reset the deferred and verify that our handler is called when the stopped state is reached.
    onStoppedCalled = CompletableDeferred()
    arcStateSender.send(ArcState.Stopped)
    assertThat(onStoppedCalled.await()).isNotNull()

    // Now reset the deferred, remove the handler, and verify that it isn't called anymore.
    onStoppedCalled = CompletableDeferred()
    arc.removeHandler(onStoppedId)
    arcStateSender.send(ArcState.Running)
    arcStateSender.send(ArcState.Stopped)
    onStoppedCalled.assertAwaitTimesOut()
    arc.stop()
  }

  @Test
  fun onError() = runBlockingTest {
    setUpFields()

    var onErrorCalled = CompletableDeferred<Unit>()
    val onErrorId = arc.onError { onErrorCalled.complete(Unit) }

    // Verify that the handler isn't called for a non-error state.
    arcStateSender.send(ArcState.Indeterminate)
    onErrorCalled.assertAwaitTimesOut()
    onErrorCalled = CompletableDeferred()
    arcStateSender.send(ArcState.Running)
    onErrorCalled.assertAwaitTimesOut()

    // Reset the deferred and verify that our handler is called when the error state is reached.
    onErrorCalled = CompletableDeferred()
    arcStateSender.send(ArcState.Error)
    assertThat(onErrorCalled.await()).isNotNull()

    // Now reset the deferred, remove the handler, and verify that it isn't called anymore.
    onErrorCalled = CompletableDeferred()
    arc.removeHandler(onErrorId)
    arcStateSender.send(ArcState.Running)
    arcStateSender.send(ArcState.Error)
    onErrorCalled.assertAwaitTimesOut()

    // Need to stop the arc to avoid runBlockingTest complaints.
    arcStateSender.send(ArcState.Stopped)
    arc.stop()
  }

  @Test
  fun waitForStart() = runBlockingTest {
    setUpFields()

    val startedArc = async { arc.waitForStart() }
    assertThat(startedArc.isCompleted).isFalse()

    arcStateSender.send(ArcState.Indeterminate)
    assertThat(startedArc.isCompleted).isFalse()

    arcStateSender.send(ArcState.Running)
    assertThat(startedArc.await()).isSameInstanceAs(arc)

    arcStateSender.send(ArcState.Stopped)
    arc.stop()
  }

  @Test
  fun waitForStart_error() = runBlockingTest {
    setUpFields()

    val startedArc = async { arc.waitForStart() }
    val error = IllegalStateException("Hello world")
    arcStateSender.send(ArcState.errorWith(error))

    val heardError = assertFailsWith(Arc.ArcErrorException::class) { startedArc.await() }
    // Not sure why there are two caused-bys..
    assertThat(heardError).hasCauseThat().hasCauseThat().isEqualTo(error)

    arcStateSender.send(ArcState.Stopped)
    arc.stop()
  }

  @Test
  fun waitForStop() = runBlockingTest {
    setUpFields()

    val stoppedArc = async { arc.waitForStop() }
    assertThat(stoppedArc.isCompleted).isFalse()

    arcStateSender.send(ArcState.Indeterminate)
    assertThat(stoppedArc.isCompleted).isFalse()

    arcStateSender.send(ArcState.Running)
    assertThat(stoppedArc.isCompleted).isFalse()

    arcStateSender.send(ArcState.Stopped)
    assertThat(stoppedArc.await()).isEqualTo(arc)
    arc.stop()
  }

  @Test
  fun waitForStop_error() = runBlockingTest {
    setUpFields()

    val stoppedArc = async { arc.waitForStop() }
    val error = IllegalStateException("Hello world")
    arcStateSender.send(ArcState.errorWith(error))

    val heardError = assertFailsWith(Arc.ArcErrorException::class) { stoppedArc.await() }
    // Not sure why there are two caused-bys..
    assertThat(heardError).hasCauseThat().hasCauseThat().isEqualTo(error)

    arcStateSender.send(ArcState.Stopped)
    arc.stop()
  }

  @Test
  fun stop() = runBlockingTest {
    setUpFields()

    // Immediately call stop on the arc, using UNDISPATCHED, so that the call is made before we get
    // to any assertions below.
    val stopped = async(start = CoroutineStart.UNDISPATCHED) { arc.stop() }

    assertWithMessage("Arc should ask arc controller to stop it")
      .that(arcController.stoppedArcs).containsExactly(arc.id)
    assertWithMessage("Call should suspend until the arc receives a `Stopped` ArcState")
      .that(stopped.isCompleted).isFalse()

    arcStateSender.send(ArcState.Stopped)
    stopped.await()
  }

  @Test
  fun callbackCollection_withCallback() {
    var collection = Arc.CallbackCollection()
    var firstCalled = false
    var secondCalled = false

    collection = collection.withCallback { firstCalled = true }
    val firstId = collection.latestCallbackId
    assertThat(firstId).isEqualTo(1)

    collection = collection.withCallback { secondCalled = true }
    val secondId = collection.latestCallbackId
    assertThat(secondId).isEqualTo(2)

    collection.trigger(ArcState.Running)
    assertThat(firstCalled).isEqualTo(true)
    assertThat(secondCalled).isEqualTo(true)
  }

  @Test
  fun callbackCollection_withoutCallback() {
    var collection = Arc.CallbackCollection()
    var firstCalled = false
    var secondCalled = false
    collection = collection.withCallback { firstCalled = true }
    val firstId = collection.latestCallbackId
    collection = collection.withCallback { secondCalled = true }

    collection = collection.withoutCallback(firstId)
    collection.trigger(ArcState.Running)

    assertThat(firstCalled).isFalse()
    assertThat(secondCalled).isTrue()
  }

  private fun TestCoroutineScope.setUpFields() {
    stateChannel = Channel()
    arcController = FakeArcController()
    arc = createArc(stateChannel.consumeAsFlow(), arcController)
    arcStateSender = ArcStateSender(arc, stateChannel)
  }

  private fun CoroutineScope.createArc(
    arcStateFlow: Flow<ArcState>,
    arcController: ArcController
  ): Arc {
    return Arc(
      id = "myArc".toArcId(),
      partitions = emptyList(),
      arcStateFlow = arcStateFlow,
      arcController = arcController,
      scope = this
    )
  }

  private suspend fun CompletableDeferred<*>.assertAwaitTimesOut(timeoutMs: Long = 500) {
    assertFailsWith(TimeoutCancellationException::class) {
      withTimeout(timeoutMs) { await() }
    }
  }

  private class ArcStateSender(arc: Arc, private val outChannel: SendChannel<ArcState>) {
    private val observeChannel = Channel<ArcState>(Channel.BUFFERED)

    init {
      // Register a general listener with the arc, so we can observe any state we send.
      arc.onArcStateChange { observeChannel.offer(it) }
    }

    /** Sends a [state] to the [outChannel], then suspends until the [observeChannel] to sees it. */
    suspend fun send(state: ArcState) {
      outChannel.send(state)
      observeChannel.receive()
    }
  }

  private class FakeArcController : ArcController {
    val stoppedArcs = mutableListOf<ArcId>()
    override suspend fun startArcForPlan(plan: Plan): Arc {
      throw UnsupportedOperationException("not-implemented")
    }

    override suspend fun stopArc(arcId: ArcId) {
      stoppedArcs.add(arcId)
    }
  }
}
