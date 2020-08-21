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

/**
 * Provides a platform-independent version of [ArcsInstant]
 * from java.time.Instant.
 */
class ArcsInstant(val millis: Long) {
    fun toEpochMilli(): Long = millis

    override fun toString(): String = millis.toString()
    override fun equals(other: Any?): Boolean {
        if (other == null || other !is ArcsInstant) return false
        return millis == other.millis
    }

    companion object PlatformInstant {
        fun ofEpochMilli(millis: Long): ArcsInstant = PlatformInstantProvider.ofEpochMilli(millis)
        fun now(): ArcsInstant = PlatformInstantProvider.now()
    }
}
