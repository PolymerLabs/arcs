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
package arcs.core.util

import arcs.core.util.Log.formatter
import arcs.core.util.Log.writer

/**
 * Analytics helper for Arcs.
 *
 * Allows for pluggable log-output sinks (see [writer]) and message [formatter]s.
 */
object Analytics {

    enum class Event {
        StartArc, StopArc, Resurrent
    }

    interface Logger {

        fun logAllocatorEvent(event: Event, arcName: String, arcId: String)

        fun logArcHostEvent(event: Event, hostId: String, arcId: String)

        fun logArcHostNotFoundException(arcHost: String)

        fun logParticleNotFoundException(particleName: String)

    }

    var logger: Logger = DEFAULT_LOGGER
}


private val DEFAULT_LOGGER = object : Analytics.Logger {

    override fun logAllocatorEvent(event: Analytics.Event,
                                   arcName: String,
                                   arcId: String) {
        Log.info { "Analytics: logAllocatorEvent: $event, $arcName, $arcId" }
    }

    override fun logArcHostNotFoundException(arcHost: String) {
        Log.info { "Analytics: logArcHostNotFoundException: $arcHost" }
    }

    override fun logParticleNotFoundException(particleName: String) {
        Log.info { "Analytics: logParticleNotFoundException: $particleName" }
    }

    override fun logArcHostEvent(
        event: Analytics.Event, hostId: String, arcId: String) {
        Log.info { "Analytics: logArcHostEvent: $event, $hostId, $arcId" }
    }
}
