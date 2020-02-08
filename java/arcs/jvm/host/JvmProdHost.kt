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
import arcs.core.host.ProdHost
import arcs.core.host.toParticleIdentifier
import arcs.sdk.Particle
import kotlin.reflect.KClass

/**
 * An [ArcHost] that runs isolatable particles that are expected to have no platform
 * dependencies directly on Android APIs.
 */
class JvmProdHost(vararg particles: KClass<out Particle>) :
    ProdHost(*particles.map { it.toParticleIdentifier() }.toTypedArray())
