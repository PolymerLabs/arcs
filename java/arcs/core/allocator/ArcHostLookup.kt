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
import arcs.core.data.Plan
import arcs.core.host.ArcHost
import arcs.core.host.ArcState
import arcs.core.host.ArcStateChangeRegistration
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.scan
import kotlinx.coroutines.launch

/** Denotes a component capable of looking up [ArcHost] instances by their id. */
interface ArcHostLookup {
  /** Looks up an [ArcHost] given a [hostId] and returns it. */
  suspend fun lookupArcHost(hostId: String): ArcHost
}

/**
 * Builds a [Flow] of [ArcState]s where each emitted value is the combined [ArcState] across all of
 * the [partitions]' [ArcHost]s.
 */
@ExperimentalCoroutinesApi
fun ArcHostLookup.createArcStateFlow(
  arcId: ArcId,
  partitions: Collection<Plan.Partition>,
  cleanupScope: CoroutineScope
): Flow<ArcState> {
  // Initial state values for each partition's arc host.
  val initialHostStates = partitions.associate { it.arcHost to ArcState.NeverStarted }

  // Construct a flow of ArcHost-ArcState pairs, where each value is the state of the arc on a
  // particular arc host.
  val baseFlow = callbackFlow {
    // Register callbacks with all of the arc hosts for state-change notifications coming from
    // the provided arcId.
    val registrations: Map<String, ArcStateChangeRegistration> =
      partitions.associate { partition ->
        val registration = lookupArcHost(partition.arcHost)
          .addOnArcStateChange(arcId) { _, state ->
            if (isClosedForSend) return@addOnArcStateChange
            offer(partition.arcHost to state)
          }

        partition.arcHost to registration
      }

    // Keep collecting state changes until the flow collection is stopped, then clean-up our
    // registrations.
    awaitClose {
      cleanupScope.launch {
        registrations.forEach { (host, registration) ->
          lookupArcHost(host).removeOnArcStateChange(registration)
        }
      }
    }
  }

  // Return a flow consisting of a single computed ArcState by finding consensus across the states
  // at each arc host.
  return baseFlow
    .scan(initialHostStates) { states, hostToState -> states + hostToState }
    .map { it.values.computeArcState() }
}

/**
 * Determines an overall [ArcState] from the values contained within the receiving [Collection].
 *
 * * If any member is [ArcState.Deleted] or [ArcState.Error], that state is returned.
 * * If all states are the same, that state is returned.
 * * If there are states which are not equal to each other within the receiving [Collection],
 *   returns [ArcState.Indeterminate].
 */
fun Collection<ArcState>.computeArcState(): ArcState {
  var commonState = ArcState.Indeterminate
  val errorsFound = mutableListOf<Throwable>()
  var anyDeleted = false
  var anyErrored = false
  var anyMismatched = false
  forEach { state ->
    when {
      state == ArcState.Deleted -> anyDeleted = true
      state == ArcState.Error -> {
        state.cause?.let(errorsFound::add)
        anyErrored = true
      }
      commonState == ArcState.Indeterminate -> commonState = state
      state != commonState -> anyMismatched = true
    }
  }
  if (anyDeleted) return ArcState.Deleted
  if (anyErrored) {
    if (errorsFound.size <= 1) return ArcState.errorWith(errorsFound.firstOrNull())
    return ArcState.errorWith(CompositeException(errorsFound))
  }
  if (anyMismatched) return ArcState.Indeterminate
  return commonState
}
