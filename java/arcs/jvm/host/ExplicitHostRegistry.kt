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
package arcs.jvm.host

import arcs.core.host.ArcHost
import arcs.core.host.HostRegistry
import arcs.core.host.api.Particle

/**
 * A [HostRegistry] that discovers the available [ArcHost]s available on this platform by using
 * explicitly registered [ArcHost]s and [Particle]s invoked by [HostRegistry.registerHost] and
 * [ExplicitHostRegistry.registerParticles].
 */
class ExplicitHostRegistry : HostRegistry {
    private val arcHosts = mutableListOf<ArcHost>()

    override suspend fun availableArcHosts() = arcHosts

    override suspend fun registerHost(host: ArcHost) {
        arcHosts.add(host)
    }

    override suspend fun unregisterHost(host: ArcHost) {
        arcHosts.remove(host)
    }
}
