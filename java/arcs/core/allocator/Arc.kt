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
import arcs.core.data.Plan
import arcs.core.host.ArcHost
import arcs.core.host.ArcState
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.atomicfu.AtomicRef
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.atomicfu.updateAndGet
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Represents an instantiated Arc running on one or more [ArcHost]s. An [Arc] can be stopped
 * via [Arc.stop], and best-effort state changes can be listened for via [onArcStateChange].
 *
 * NOTE: that currently [onArcStateChange] listeners are not persistent across service restarts,
 * therefore if an [ArcHost] is running in a [Service], or on another device, and they restart,
 * you will not receive updates from those hosts.
 *
 * TODO: add some mechanism to detect host crashes and re-register state change listeners.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class Arc(
  val id: ArcId,
  val partitions: List<Plan.Partition>,
  private val arcStateFlow: Flow<ArcState>,
  private val arcController: ArcController,
  private val scope: CoroutineScope
) {
  private val arcStateInternal: AtomicRef<ArcState> = atomic(ArcState.NeverStarted)
  private val callbacks = atomic(CallbackCollection())
  private var arcStateCollectionJob: Job? = null
  private val registered = atomic(false)

  internal constructor(
    id: ArcId,
    partitions: List<Plan.Partition>,
    arcHostLookup: ArcHostLookup,
    arcController: ArcController,
    scope: CoroutineScope
  ) : this(
    id,
    partitions,
    arcHostLookup.createArcStateFlow(id, partitions, scope),
    arcController,
    scope
  )

  /**
   *  The current running state of an Arc. This is computed by computing the dominant state
   *  across all [ArcHost]s in an [Arc], where dominant ordering is defined by the ordering in
   *  [ArcState], for example, [Error] is greater than [Running], so if one [ArcHost] is in
   *  state [Error], and another is in state [Running], the overall state of the [Arc]
   *  is considered to be [Error].
   */
  var arcState: ArcState
    get() = arcStateInternal.value
    private set(state) {
      arcStateInternal.update { state }
    }

  /** Called whenever the [ArcState] changes to [Running]. */
  fun onRunning(handler: () -> Unit): Int = onArcStateChangeFiltered(ArcState.Running, handler)

  /** Called whenever the [ArcState] changes to [Stopped]. */
  fun onStopped(handler: () -> Unit): Int = onArcStateChangeFiltered(ArcState.Stopped, handler)

  /** Called whenever the [ArcState] changes to [Error]. */
  fun onError(handler: () -> Unit): Int = onArcStateChangeFiltered(ArcState.Error, handler)

  /**
   * Unregisters a handler registered with [onRunning], [onStopped], or [onError] by the given
   * [handlerId] (return value from the aforementioned methods).
   */
  fun removeHandler(handlerId: Int): Unit = callbacks.update { it.withoutCallback(handlerId) }

  /** Wait for the current [Arc] to enter a [Stopped] state. */
  suspend fun waitForStop() = waitFor(ArcState.Stopped)

  /** Wait for the current [Arc] to enter a [Running] state. */
  suspend fun waitForStart() = waitFor(ArcState.Running)

  /** Stop the current [Arc]. */
  suspend fun stop() {
    arcController.stopArc(id)
    waitForStop()
    arcStateCollectionJob?.cancelAndJoin()
  }

  // VisibleForTesting
  fun onArcStateChange(handler: (ArcState) -> Unit): Int {
    val callbackId = callbacks.updateAndGet { it.withCallback(handler) }.latestCallbackId
    maybeRegisterChangeHandlerWithArcHosts()
    handler(arcState)
    return callbackId
  }

  private fun maybeRegisterChangeHandlerWithArcHosts() {
    if (!registered.compareAndSet(expect = false, update = true)) return

    arcStateCollectionJob = scope.launch {
      arcStateFlow.collect { state ->
        arcState = state
        callbacks.value.trigger(state)
      }
    }
  }

  private fun onArcStateChangeFiltered(stateToFilter: ArcState, handler: () -> Unit): Int {
    if (arcState == stateToFilter) handler()
    return onArcStateChange {
      if (it == stateToFilter) handler()
    }
  }

  // suspend until a desired state is achieved
  private suspend fun waitFor(state: ArcState): Arc {
    if (arcState == state) return this

    var handlerId: Int? = null
    fun cleanUp() {
      val nonNullHandler = handlerId ?: return
      removeHandler(nonNullHandler)
    }

    return suspendCancellableCoroutine { continuation ->
      continuation.invokeOnCancellation { cleanUp() }
      handlerId = onArcStateChange { newState ->
        if (!continuation.isActive) return@onArcStateChange
        when (newState) {
          state -> {
            cleanUp()
            continuation.resume(this@Arc)
          }
          ArcState.Error -> {
            cleanUp()
            continuation.resumeWithException(ArcErrorException(newState.cause))
          }
        }
      }
    }
  }

  /** Used for signaling to listeners that an Arc has entered the Error state. */
  class ArcErrorException(cause: Throwable? = null) :
    RuntimeException("Arc reached Error state", cause)

  // VisibleForTesting
  data class CallbackCollection(
    val latestCallbackId: Int = 0,
    private val callbacks: Map<Int, (ArcState) -> Unit> = emptyMap()
  ) {
    fun withCallback(callback: (ArcState) -> Unit): CallbackCollection {
      val newCallbacks = callbacks + ((latestCallbackId + 1) to callback)
      return CallbackCollection(latestCallbackId + 1, newCallbacks)
    }

    fun withoutCallback(callbackId: Int): CallbackCollection {
      val newCallbacks = callbacks - callbackId
      return CallbackCollection(latestCallbackId, newCallbacks)
    }

    fun trigger(state: ArcState) {
      callbacks.values.forEach { it(state) }
    }
  }
}
