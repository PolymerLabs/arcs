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

import arcs.core.host.AbstractArcHost
import arcs.core.host.ArcHost
import arcs.core.host.ParticleRegistration
import arcs.core.host.ProdHost
import arcs.core.util.Time
import arcs.jvm.util.JvmTime

/**
 * An [ArcHost] that runs isolatable particles that are expected to have no platform
 * dependencies directly on Android APIs.
 */
open class JvmProdHost(
    vararg particles: ParticleRegistration
) : AbstractArcHost(*particles), ProdHost {
    override val platformTime: Time = JvmTime
}
