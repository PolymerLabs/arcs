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
import arcs.core.host.SchedulerProvider
import arcs.core.util.Time
import arcs.jvm.util.JvmTime

/**
 * An [ArcHost] that runs on Java VM platforms.
 */
open class JvmHost(
    schedulerProvider: SchedulerProvider,
    vararg particles: ParticleRegistration
) : AbstractArcHost(schedulerProvider, *particles) {
    override val platformTime: Time = JvmTime
}
