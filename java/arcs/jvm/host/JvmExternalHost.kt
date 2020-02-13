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

import arcs.core.crdt.CrdtEntity
import arcs.core.data.HandleConnectionSpec
import arcs.core.data.RawEntity
import arcs.core.host.ArcHost
import arcs.core.host.ExternalHost
import arcs.core.host.ParticleIdentifier
import arcs.core.host.ParticleNotFoundException
import arcs.core.host.toParticleIdentifier
import arcs.core.storage.StorageProxy
import arcs.sdk.Particle
import kotlin.reflect.KClass

/**
 * An [ArcHost] that runs isolatable particles that are expected to have no platform
 * dependencies directly on Android APIs.
 */
open class JvmExternalHost(
    vararg particles: KClass<out Particle>
) : ExternalHost(*particles.map { it.toParticleIdentifier() }.toTypedArray()) {

    private var particleConstructorsById: Map<ParticleIdentifier, () -> Particle> =
        particles.associateBy(
            { it.toParticleIdentifier() },
            { klass -> { klass.java.newInstance() } }
        )

    override suspend fun instantiateParticle(identifier: ParticleIdentifier) =
        particleConstructorsById[identifier]?.invoke() ?: throw Exception(
            "Particle $identifier not found."
        )
}
