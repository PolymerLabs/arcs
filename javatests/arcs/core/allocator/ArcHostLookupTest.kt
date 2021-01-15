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
import arcs.core.common.CompositeException
import arcs.core.common.toArcId
import arcs.core.data.Plan
import arcs.core.host.ArcHost
import arcs.core.host.ArcState
import arcs.core.host.ArcStateChangeCallback
import arcs.core.host.ArcStateChangeRegistration
import arcs.core.host.ParticleIdentifier
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
@Suppress("UnsafeCoroutineCrossing")
class ArcHostLookupTest {
  @get:Rule
  val log = LogRule()

  @Test
  fun createArcStateFlow() = runBlockingTest {
    val host1 = FakeArcHost("1", this@runBlockingTest)
    val host2 = FakeArcHost("2", this@runBlockingTest)
    val partition1 = Plan.Partition(arcId = ARC_ID, arcHost = "1", particles = emptyList())
    val partition2 = Plan.Partition(arcId = ARC_ID, arcHost = "2", particles = emptyList())
    val lookup = listOf(host1, host2).toLookup()
    val expectedStates = listOf(
      // First state is NeverStarted.
      ArcState.NeverStarted,
      // Second state is Indeterminate because only one of the hosts will have updated to `Running`.
      ArcState.Indeterminate,
      // Third state is Running because both hosts will have updated to `Running`.
      ArcState.Running
    )

    val statesHeard = async {
      lookup.createArcStateFlow(
        ARC_ID.toArcId(),
        setOf(partition1, partition2),
        cleanupScope = this@runBlockingTest
      ).take(expectedStates.size)
        .toList()
    }
    host1.setArcState(ARC_ID.toArcId(), ArcState.Running)
    host2.setArcState(ARC_ID.toArcId(), ArcState.Running)

    assertThat(statesHeard.await()).containsExactlyElementsIn(expectedStates).inOrder()
  }

  @Test
  fun createArcStateFlow_canceled_unregistersListeners() = runBlockingTest {
    val host = FakeArcHost("1", this@runBlockingTest)
    val partition = Plan.Partition(arcId = ARC_ID, arcHost = "1", particles = emptyList())
    val lookup = listOf(host).toLookup()
    val heardEvent = CompletableDeferred<Unit>()

    val flowConsumeJob = async {
      lookup.createArcStateFlow(
        ARC_ID.toArcId(),
        setOf(partition),
        cleanupScope = this@runBlockingTest
      ).collect {
        if (it == ArcState.Running) heardEvent.complete(Unit)
      }
    }

    // Set the state to Running, then wait until we've heard it. The host's listeners map should be
    // non-empty.
    host.setArcState(ARC_ID.toArcId(), ArcState.Running)
    heardEvent.await()
    assertThat(host.listeners).isNotEmpty()

    // Cancel the flow consumption job, the flow builder should then un-register listeners with
    // the host... so wait until the removal method is called once, and verify that the map is
    // empty.
    flowConsumeJob.cancelAndJoin()
    host.removeListenerCalls.filter { it == 1 }.first()
    assertThat(host.listeners).isEmpty()
  }

  @Test
  fun computeArcState_withDeleted_returnsDeleted() {
    val states = listOf(
      ArcState.Running,
      ArcState.Running,
      ArcState.Running,
      ArcState.Deleted,
      ArcState.Running
    )
    assertThat(states.computeArcState()).isEqualTo(ArcState.Deleted)
  }

  @Test
  fun computeArcState_withError_returnsError() {
    val states = listOf(
      ArcState.Running,
      ArcState.Running,
      ArcState.Running,
      ArcState.Error,
      ArcState.Running
    )
    assertThat(states.computeArcState()).isEqualTo(ArcState.Error)
  }

  @Test
  fun computeArcState_withSingleError_returnsThatError() {
    val states = listOf(
      ArcState.Running,
      ArcState.errorWith(IllegalArgumentException("oops")),
      ArcState.Running
    )
    val expected = ArcState.errorWith(IllegalArgumentException("oops"))

    assertThat(states.computeArcState()).isEqualTo(expected)
  }

  @Test
  fun computeArcState_withMultipleErrors_returnsCompositeError() {
    val exceptions = listOf(
      IllegalArgumentException("oops"),
      IllegalStateException("oops"),
      UnsupportedOperationException("oops")
    )
    val states = exceptions.map { ArcState.errorWith(it) }
    val expected = ArcState.errorWith(CompositeException(exceptions))

    assertThat(states.computeArcState()).isEqualTo(expected)
  }

  @Test
  fun computeArcState_withDeleted_ignoresErrors() {
    val statesErrorLast = listOf(
      ArcState.Running,
      ArcState.Deleted,
      ArcState.Error
    )
    val statesErrorFirst = listOf(
      ArcState.Running,
      ArcState.Error,
      ArcState.Deleted
    )
    assertThat(statesErrorLast.computeArcState()).isEqualTo(ArcState.Deleted)
    assertThat(statesErrorFirst.computeArcState()).isEqualTo(ArcState.Deleted)
  }

  @Test
  fun computeArcState_withMismatch_returnsIndeterminate() {
    val states = listOf(
      ArcState.Running,
      ArcState.Running,
      ArcState.Stopped,
      ArcState.Running
    )
    assertThat(states.computeArcState()).isEqualTo(ArcState.Indeterminate)
  }

  @Test
  fun computeArcState_allMatching_returnsCommon() {
    val states = listOf(
      ArcState.Running,
      ArcState.Running,
      ArcState.Running
    )
    assertThat(states.computeArcState()).isEqualTo(ArcState.Running)
  }

  private fun Collection<ArcHost>.toLookup(): ArcHostLookup {
    return object : ArcHostLookup {
      override suspend fun lookupArcHost(hostId: String): ArcHost {
        return requireNotNull(find { it.hostId == hostId }) { "No host found with id: $hostId" }
      }
    }
  }

  private open class FakeArcHost(
    override val hostId: String,
    private val scope: CoroutineScope
  ) : ArcHost {
    private val arcStates = mutableMapOf<ArcId, ArcState>()
    val listeners = mutableMapOf<ArcStateChangeRegistration, ArcStateChangeCallback>()
    val removeListenerCalls = MutableStateFlow(0)

    fun setArcState(arcId: ArcId, state: ArcState) {
      val oldState = arcStates[arcId]
      arcStates[arcId] = state
      if (oldState != state) {
        notifyStateChange(arcId, state)
      }
    }

    override suspend fun registeredParticles(): List<ParticleIdentifier> = emptyList()
    override suspend fun startArc(partition: Plan.Partition) = Unit
    override suspend fun stopArc(partition: Plan.Partition) = Unit
    override suspend fun isHostForParticle(particle: Plan.Particle): Boolean = true
    override suspend fun pause() = Unit
    override suspend fun unpause() = Unit
    override suspend fun waitForArcIdle(arcId: String) = Unit

    override suspend fun lookupArcHostStatus(partition: Plan.Partition): ArcState {
      return requireNotNull(arcStates[partition.arcId.toArcId()]) {
        "No arc state available for Partition: $partition"
      }
    }
    override suspend fun addOnArcStateChange(
      arcId: ArcId,
      block: ArcStateChangeCallback
    ): ArcStateChangeRegistration {
      return ArcStateChangeRegistration(arcId, block).also {
        listeners[it] = block
      }
    }

    override suspend fun removeOnArcStateChange(registration: ArcStateChangeRegistration) {
      listeners.remove(registration)
      removeListenerCalls.value = removeListenerCalls.value + 1
    }

    private fun notifyStateChange(arcId: ArcId, state: ArcState) {
      listeners.filter { (registration, _) -> registration.arcId() == arcId.toString() }
        .forEach { _, callback ->
          scope.launch { callback(arcId, state) }
        }
    }
  }

  companion object {
    private const val ARC_ID = "myArc"
  }
}
