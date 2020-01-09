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
 * Java ServiceLoader and SPI.
 */
class ServiceLoaderHostRegistry() : AnnotationBasedHostRegistry() {

    init {
        loadAndRegisterHostsAndParticles().forEach { host -> registerHost(host) }
    }

    companion object {
        val hostRegistry = ServiceLoaderHostRegistry()
        fun instance() = hostRegistry
    }

    private fun loadAndRegisterHostsAndParticles(): List<ArcHost> {
        // Load all @AutoService(Particle.class) types
        val allParticles = ServiceLoader.load(Particle::class.java).iterator().asSequence()
            .map { p -> p.javaClass.kotlin }.toList()

        // Load @AutoService(ArcsHost) types and construct them, handing each a list of particles
        return ServiceLoader.load(ArcHost::class.java).iterator().asSequence()
            .map { host ->
                registerParticles(findParticlesForHost(allParticles, host), host)
            }.toList()
    }


}

