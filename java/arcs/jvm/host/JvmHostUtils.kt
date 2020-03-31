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

import arcs.core.host.ParticleIdentifier
import arcs.core.host.ParticleRegistration
import arcs.core.host.ProdHost
import arcs.core.host.api.Particle
import arcs.core.host.toParticleIdentifier
import java.util.ServiceLoader
import kotlin.reflect.KClass

/**
 * Load Particles compiled with `arcs_kt_particles` via the [ServiceLoader] from class path.
 *
 * @property host which [TargetHost] to filter for.
 */
fun scanForParticles(host: KClass<out ProdHost> = ProdHost::class): Array<ParticleRegistration> =
    ServiceLoader.load(Particle::class.java).iterator().asSequence().filter { particle ->
            isParticleForHost(host, particle::class.java)
        }.map { particle ->
            particle.javaClass.kotlin.toParticleIdentifier() to suspend {
                particle.javaClass.getDeclaredConstructor().newInstance()
            }
        }.toList().toTypedArray()

private fun isParticleForHost(host: KClass<out ProdHost>, particle: Class<out Particle>) =
    host == (particle.getAnnotation(TargetHost::class.java)?.value ?: ProdHost::class)
