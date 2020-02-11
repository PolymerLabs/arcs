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

/**
 * This class maintains a registry of all available ArcHost implementations in the system.
 */
interface HostRegistry {
    /**
     * Returns a list of all current [ArcHost] implementations in the system.
     */
    suspend fun availableArcHosts(): List<ArcHost>

    /**
     * Register a new [ArcHost].
     */
    suspend fun registerHost(host: ArcHost): Unit

    /**
     * Remove an [ArcHost] from the list of those available.
     */
    suspend fun unregisterHost(host: ArcHost): Unit
}
