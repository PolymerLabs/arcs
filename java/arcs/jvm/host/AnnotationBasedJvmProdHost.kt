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

import arcs.core.host.ArcHost
import arcs.core.host.ParticleIdentifier
import arcs.core.host.ParticleRegistration
import arcs.core.host.ProdHost
import arcs.core.host.api.Particle
import arcs.core.host.toParticleIdentifier
import arcs.core.util.Time
import arcs.jvm.util.JvmTime
import java.util.ServiceLoader
import kotlin.reflect.KClass

/**
 * An [ArcHost] that runs isolatable particles that are expected to have no platform
 * dependencies. Automatically scans class path using [ServiceLoader] to find additional particles.
 *
 * @property targetHost the [TargetHost] class this host will register particles for.
 * @property additionalParticles extra [Particle]s not automatically scanned from classpath.
 */
open class AnnotationBasedJvmProdHost(
    targetHost: KClass<out JvmProdHost>,
    vararg additionalParticles: ParticleRegistration
) : JvmProdHost(*combine(scanForParticles(targetHost), additionalParticles)) {

    override val platformTime: Time = JvmTime

    companion object {
        /**
         * Load Particles marked @AutoService(Particle::class) from class path.
         */
        fun scanForParticles(host: KClass<out JvmProdHost>): Array<ParticleRegistration> =
            ServiceLoader.load(Particle::class.java).iterator().asSequence()
                .filter {
                        particle -> isParticleForHost(host, particle::class.java)
                }.map { p ->
                    p.javaClass.kotlin.toParticleIdentifier() to suspend {
                        p.javaClass.getDeclaredConstructor().newInstance()
                    }
                }.toList().toTypedArray()

        fun isParticleForHost(host: KClass<out ProdHost>, particle: Class<out Particle>) =
            host == (particle.getAnnotation(TargetHost::class.java)?.value ?: JvmProdHost::class)
    }
}

private fun combine(
    scannedParticles: Array<ParticleRegistration>,
    additionalParticles: Array<out ParticleRegistration>
): Array<Pair<ParticleIdentifier, suspend () -> Particle>> {
    return scannedParticles.plus(additionalParticles)
}
