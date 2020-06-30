/*
 * Copyright 2019 Google LLC.
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
import arcs.core.host.ArcState.Deleted
import arcs.core.host.ArcState.Error
import arcs.core.host.ArcState.Indeterminate
import arcs.core.host.ArcState.NeverStarted
import arcs.core.host.ArcState.Running
import arcs.core.host.ArcState.Stopped
import arcs.core.host.ArcStateChangeRegistration
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlinx.atomicfu.AtomicRef
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.scan
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

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
class Arc internal constructor(
    val id: ArcId,
    private val allocator: Allocator,
    val partitions: List<Plan.Partition>,
    private val coroutineContext: CoroutineContext = EmptyCoroutineContext
) {
    private val arcStateInternal: AtomicRef<ArcState> = atomic(NeverStarted)
    private val arcStateChangeHandlers = atomic(listOf<(ArcState) -> Unit>())
    private lateinit var arcStatesByHostFlow: Flow<ArcState>
    private lateinit var closeFlow: () -> Unit
    private val registered = atomic(false)
    private val registrations = mutableMapOf<String, ArcStateChangeRegistration>()

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

    private fun onArcStateChange(handler: (ArcState) -> Unit) {
        arcStateChangeHandlers.update { it + handler }
        maybeRegisterChangeHandlerWithArcHosts()
        handler(arcState)
    }

    private fun onArcStateChangeFiltered(stateToFilter: ArcState, handler: () -> Unit) {
        if (arcState == stateToFilter) {
            handler()
        }

        onArcStateChange {
            if (it == stateToFilter) {
                handler()
            }
        }
    }

    /** Called whenever the [ArcState] changes to [Running]. */
    fun onRunning(handler: () -> Unit) = onArcStateChangeFiltered(Running, handler)

    /** Called whenever the [ArcState] changes to [Stopped]. */
    fun onStopped(handler: () -> Unit) = onArcStateChangeFiltered(Stopped, handler)

    /** Called whenever the [ArcState] changes to [Error]. */
    fun onError(handler: () -> Unit) = onArcStateChangeFiltered(Error, handler)

    private fun recomputeArcState(states: Collection<ArcState>): ArcState = when {
        states.any { it == Deleted } -> Deleted
        states.any { it == Error } -> Error
        states.all { it == Running } -> Running
        states.all { it == Stopped } -> Stopped
        states.all { it == NeverStarted } -> NeverStarted
        else -> Indeterminate
    }

    private fun maybeRegisterChangeHandlerWithArcHosts() {
        if (!registered.compareAndSet(false, true)) {
            return
        }

        val scope = CoroutineScope(
            coroutineContext + Job() + CoroutineName("Arc (flow collector) $id")
        )

        arcStatesByHostFlow = callbackFlow {
            partitions.forEach { partition ->
                val arcHost = allocator.lookupArcHost(partition.arcHost)
                registrations[partition.arcHost] = arcHost.addOnArcStateChange(id) { _, state ->
                    if (!isClosedForSend) {
                        offer(partition.arcHost to state)
                    }
                }
            }
            closeFlow = { close() }
            awaitClose { unregisterChangeHandlerWithArcHosts(scope) }
        }.scan(
            partitions.map { it.arcHost to NeverStarted }.associateBy({ it.first }, { it.second })
        ) { states, (host, state) ->
            val newStates = states.toMutableMap()
            newStates[host] = state
            newStates
        }.map {
            recomputeArcState(it.values)
        }.onEach { state ->
            arcState = state
            arcStateChangeHandlers.value.toList().forEach { handler -> handler(state) }
        }

        arcStatesByHostFlow.launchIn(scope)
    }

    // suspend until a desired state is achieved
    private suspend fun waitFor(state: ArcState): Arc {
        if (arcState == state) return this

        val deferred: CompletableDeferred<Arc> = CompletableDeferred()

        val handler = { newState: ArcState ->
            when (newState) {
                state -> deferred.complete(this@Arc)
                Error -> deferred.completeExceptionally(ArcErrorException())
                else -> Unit
            }
            Unit
        }
        onArcStateChange(handler)

        return deferred.await().also {
            arcStateChangeHandlers.update { it - handler }
        }
    }

    /** Wait for the current [Arc] to enter a [Stopped] state. */
    suspend fun waitForStop() = waitFor(Stopped)

    /** Wait for the current [Arc] to enter a [Running] state. */
    suspend fun waitForStart() = waitFor(Running)

    /** Stop the current [Arc]. */
    suspend fun stop() = allocator.stopArc(id).also {
        onArcStateChangeFiltered(Stopped) { closeFlow() }
    }

    private fun unregisterChangeHandlerWithArcHosts(scope: CoroutineScope) = scope.launch {
        registrations.forEach { (host, registration) ->
            val arcHost = allocator.lookupArcHost(host)
            arcHost.removeOnArcStateChange(registration)
        }
    }

    /** Used for signaling to listeners that an Arc has entered the Error state. */
    class ArcErrorException(
        msg: String = "Arc reached Error state",
        cause: Throwable? = null
    ) : RuntimeException(msg, cause)
}
