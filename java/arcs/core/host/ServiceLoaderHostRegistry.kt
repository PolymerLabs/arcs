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
class ServiceLoaderHostRegistry() : HostRegistry {
    val hosts: MutableList<ArcHost> = mutableListOf()

    init {
        loadAndRegisterHostsAndParticles().forEach { host -> registerHost(host) }
    }

    companion object {
        fun instance() = ServiceLoaderHostRegistry()
    }

    override fun availableArcHosts(): List<ArcHost> {
        return hosts
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

    private fun registerParticles(
        particles: List<KClass<out Particle>>,
        host: ArcHost
    ): ArcHost {
        particles.forEach { particle -> host.registerParticle(particle) }
        return host
    }

    private fun findParticlesForHost(
        allParticles: List<KClass<out Particle>>,
        host: ArcHost?
    ): List<KClass<out Particle>> {
        return allParticles
            .filter { part ->
                part.java.annotations.filter { target: Annotation ->
                    targetHostMatches(target, host)
                }.count() > 0
            }.toList()
    }

    private fun targetHostMatches(target: Annotation, host: ArcHost?) =
        target.annotationClass.java.getAnnotation(TargetHost::class.java)
            ?.value?.java == host?.javaClass

    override fun registerHost(host: ArcHost) {
        hosts.add(host)
    }

    override fun unregisterHost(host: ArcHost) {
        hosts.remove(host)
    }
}
