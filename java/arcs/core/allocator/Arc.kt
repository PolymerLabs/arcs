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
import arcs.core.host.ArcState
import arcs.core.host.ArcState.Deleted
import arcs.core.host.ArcState.Error
import arcs.core.host.ArcState.Indeterminate
import arcs.core.host.ArcState.NeverStarted
import arcs.core.host.ArcState.Running
import arcs.core.host.ArcState.Stopped
import arcs.core.host.ArcStateChangeRegistration
import kotlinx.coroutines.CompletableDeferred
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
class Arc internal constructor(
    val id: ArcId,
    private val allocator: Allocator,
    val partitions: List<Plan.Partition>,
    private var arcStateInternal: ArcState = NeverStarted
) {
    private val arcStateChangeHandlers = mutableListOf<(ArcState) -> Unit>()
    private val arcStatesByHostId = mutableMapOf<String, ArcState>()
    // Used to remove the listener from the ArcHost later
    private var registration: ArcStateChangeRegistration? = null

    /**
     *  The current running state of an Arc. This is computed by computing the dominant state
     *  across all [ArcHost]s in an [Arc], where dominant ordering is defined by the ordering in
     *  [ArcState], for example, [Error] is greater than [Running], so if one [ArcHost] is in
     *  state [Error], and another is in state [Running], the overall state of the [Arc]
     *  is considered to be [Error].
     */
    var arcState: ArcState
        get() = arcStateInternal
        private set(state) = sync(this) {
            if (arcStateInternal != state) {
                arcStateInternal = state
                fireArcStateChange()
            }
        }

    private fun onArcStateChange(handler: (ArcState) -> Unit) = sync(this) {
        if (arcStateChangeHandlers.isEmpty()) {
            registerChangeHandlerWithArcHosts()
        }
        arcStateChangeHandlers += handler
        handler(arcState)
    }

    private suspend fun onArcStateChangeFiltered(stateToFilter: ArcState, handler: () -> Unit) {
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
    suspend fun onRunning(handler: () -> Unit) = onArcStateChangeFiltered(Running, handler)

    /** Called whenever the [ArcState] changes to [Stopped]. */
    suspend fun onStopped(handler: () -> Unit) = onArcStateChangeFiltered(Stopped, handler)

    /** Called whenever the [ArcState] changes to [Error]. */
    suspend fun onError(handler: () -> Unit) = onArcStateChangeFiltered(Error, handler)

    private fun fireArcStateChange() {
        sync(this) {
            arcStateChangeHandlers.forEach {
                it(arcState)
            }
        }
    }

    private fun recomputeArcState() {
        sync(this) {
            val states = arcStatesByHostId.values
            arcState = when {
                states.any { it == Deleted } -> Deleted
                states.any { it == Error } -> Error
                states.all { it == Running } -> Running
                states.all { it == Stopped } -> Stopped
                states.all { it == NeverStarted } -> NeverStarted
                else -> Indeterminate
            }
        }
    }

    private suspend fun fetchCurrentStates() {
        partitions.forEach {
            val arcHost = allocator.lookupArcHost(it.arcHost)
            arcStatesByHostId[it.arcHost] = arcHost.lookupArcHostStatus(it)
        }
    }

    private fun registerChangeHandlerWithArcHosts() = sync(this) {
        require(registration == null) {
            "registration called more than once"
        }
        runBlocking {
            // first poll the current states of all hosts
            fetchCurrentStates()

            // Register event listeners
            partitions.forEach { partition ->
                val arcHost = allocator.lookupArcHost(partition.arcHost)
                registration = arcHost.addOnArcStateChange(id) { _, state ->
                    sync(this) {
                        arcStatesByHostId[partition.arcHost] = state
                        recomputeArcState()
                    }
                }
            }
        }

        recomputeArcState()
    }

    // suspend until a desired state is achieved
    private suspend fun waitFor(state: ArcState): Arc {
        if (arcState == state) return this

        val deferred: CompletableDeferred<Arc> = CompletableDeferred()
        onArcStateChangeFiltered(state) {
            deferred.complete(this@Arc)
        }

        fetchCurrentStates()
        recomputeArcState()
        return deferred.await()
    }

    /** Wait for the current [Arc] to enter a [Stopped] state. */
    suspend fun waitForStop() = waitFor(Stopped)

    /** Wait for the current [Arc] to enter a [Running] state. */
    suspend fun waitForStart() = waitFor(Running)

    /** Stop the current [Arc]. */
    suspend fun stop() = allocator.stopArc(id)

    private fun <T> sync(obj: Any, block: () -> T) = block()
}
