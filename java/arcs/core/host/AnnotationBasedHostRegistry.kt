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
import kotlin.reflect.KClass

/**
 * A HostRegistry that automatically registers particles with hosts by matching [TargetHost]
 * annotated annotations on [Particle] classes with [ArcHost]s.
 */
abstract class AnnotationBasedHostRegistry : HostRegistry {
    private val hosts: MutableList<ArcHost> = mutableListOf()

    override val availableArcHosts: List<ArcHost>
        get() = hosts

    protected fun registerParticles(
        particles: List<KClass<out Particle>>,
        host: ArcHost
    ): ArcHost {
        particles.forEach { particle -> host.registerParticle(particle) }
        return host
    }

    override fun registerHost(host: ArcHost) {
        hosts.add(host)
    }

    override fun unregisterHost(host: ArcHost) {
        hosts.remove(host)
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
