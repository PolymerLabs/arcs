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

    /**
     * Pauses all known hosts, runs the [block], then unpauses the hosts.
     */
    suspend fun pauseAllHostsFor(block: suspend () -> Unit) {
        val hosts = registries.value.flatMap { it.availableArcHosts() }
        hosts.forEach { it.pause() }
        try {
            block()
        } finally {
            hosts.forEach { it.unpause() }
        }
    }
}
