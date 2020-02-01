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
import arcs.core.util.guardWith
import arcs.sdk.Particle
import kotlin.reflect.KClass
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * A HostRegistry that automatically registers particles with hosts by matching [TargetHost]
 * annotated annotations on [Particle] classes with [ArcHost]s.
 */
abstract class AnnotationBasedHostRegistry : HostRegistry {
    private val registryMutex = Mutex()
    private val hosts: MutableList<ArcHost> by guardWith(registryMutex, mutableListOf())

    override suspend fun availableArcHosts(): List<ArcHost> = registryMutex.withLock { hosts }

    protected suspend fun registerParticles(
        particles: List<KClass<out Particle>>,
        host: ArcHost
    ): ArcHost {
        particles.forEach { particle -> host.registerParticle(ParticleIdentifier.from(particle)) }
        return host
    }

    override suspend fun registerHost(host: ArcHost) {
        registryMutex.withLock { hosts.add(host) }
    }

    override suspend fun unregisterHost(host: ArcHost) {
        registryMutex.withLock { hosts.remove(host) }
    }

    protected fun findParticlesForHost(
        allParticles: List<KClass<out Particle>>,
        host: ArcHost
    ): List<KClass<out Particle>> {
        return allParticles
            .filter { part ->
                part.java.annotations.filter { target: Annotation ->
                    targetHostMatches(target, host)
                }.isNotEmpty()
            }.toList()
    }

    private fun targetHostMatches(target: Annotation, host: ArcHost) =
        target.annotationClass.java.getAnnotation(TargetHost::class.java)
            ?.value?.java == host.javaClass
}
