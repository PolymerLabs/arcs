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
class ArcsInstant private constructor(val platformInstant: PlatformInstant) {
    @Suppress("NewApi") // See b/167491554
    fun toEpochMilli(): Long = platformInstant.toEpochMilli()

    @Suppress("NewApi") // See b/167491554
    override fun toString(): String = platformInstant.toString()
    @Suppress("NewApi") // See b/167491554
    override fun equals(other: Any?): Boolean {
        if (other == null || other !is ArcsInstant) return false
        return platformInstant == other.platformInstant
    }

    companion object {
        @Suppress("NewApi") // See b/167491554
        fun ofEpochMilli(millis: Long): ArcsInstant =
            ArcsInstant(PlatformInstant.ofEpochMilli(millis))
        @Suppress("NewApi") // See b/167491554
        fun now(): ArcsInstant = ArcsInstant(PlatformInstant.now())
    }
}
