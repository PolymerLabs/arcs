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

import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update

/** 
 * ArcHostManager mantains a set of HostRegistries to perform operations on all Hosts.
 * Registries are expected to register with the manager at creation.
 */
object ArcHostManager {
    private val registries = atomic(setOf<HostRegistry>())

    fun register(registry: HostRegistry) = registries.update { it + setOf(registry) }

    // Pause all known Hosts.
    suspend fun pauseAllHosts() {
        registries.value.flatMap { it.availableArcHosts() }.forEach { it.pause() }
    }

    // Unpause all known Hosts.
    suspend fun unPauseAllHosts() {
        registries.value.flatMap { it.availableArcHosts() }.forEach { it.unpause() }
    }
}
