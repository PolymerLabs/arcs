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
package arcs.jvm.host

import arcs.sdk.Particle
import kotlin.reflect.KClass

/**
 * A []HostRegistry] that discovers the available [ArcHost]s available on this platform by using
 * explicitly registered [ArcHost]s and [Particle]s invoked by [HostRegistry.registerHost] and
 * [ExplicitHostRegistry.registerParticles].
 */
object ExplicitHostRegistry : AnnotationBasedHostRegistry() {

    /**
     * Explicitly register all particles used.
     */
    suspend fun registerParticles(allParticles: List<KClass<out Particle>>) {
        availableArcHosts().forEach { host ->
            registerParticles(findParticlesForHost(allParticles, host), host)
        }
    }
}
