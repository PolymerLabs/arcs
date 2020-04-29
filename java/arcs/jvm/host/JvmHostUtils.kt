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

import arcs.core.data.Plan
import arcs.core.host.ArcHost
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
fun scanForParticles(host: KClass<out ArcHost> = ProdHost::class): Array<ParticleRegistration> =
    ServiceLoader.load(Particle::class.java).iterator().asSequence().filter { particle ->
        isParticleForHost(host, particle::class.java)
    }.map { particle: Particle ->
        val construct: suspend (Plan.Particle?) -> Particle = {
            val ctor =
                particle.javaClass.getDeclaredConstructor()
            if (ctor.parameters.isEmpty()) {
                ctor.newInstance()
            } else {
                ctor.newInstance(it)
            }
        }
        particle.javaClass.kotlin.toParticleIdentifier() to construct
    }.toList().toTypedArray()

private fun isParticleForHost(host: KClass<out ArcHost>, particle: Class<out Particle>) =
    host == (particle.getAnnotation(TargetHost::class.java)?.value ?: ProdHost::class)
