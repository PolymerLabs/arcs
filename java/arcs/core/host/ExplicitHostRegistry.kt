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
package arcs.core.host

import arcs.core.sdk.Particle
import java.util.ServiceLoader
import kotlin.reflect.KClass
import kotlin.sequences.asSequence

/**
 * A HostRegistry that discovers the available [ArcHost]s available on this platform by using
 * explicitly registered [ArcHost]s and [Particle]s invoked by [HostRegistry.registerHost] and
 * [ExplicitHostRegistry.registerParticles].
 */
class ExplicitHostRegistry() : AnnotationBasedHostRegistry() {

    companion object {
        val hostRegistry = ExplicitHostRegistry()
        fun instance() = hostRegistry
    }

    /**
     * Explicitly register all particles used.
     */
    fun registerParticles(allParticles: List<KClass<out Particle>>): Unit {
        hosts.map { host ->
            registerParticles(findParticlesForHost(allParticles, host), host)
        }
    }
}

