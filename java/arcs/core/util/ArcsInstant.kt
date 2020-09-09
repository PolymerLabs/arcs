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
    constructor(millis: Long) : this(PlatformInstant.ofEpochMilli(millis))
    fun toEpochMilli(): Long = platformInstant.toEpochMilli()

    override fun toString(): String = platformInstant.toString()
    override fun equals(other: Any?): Boolean {
        if (other == null || other !is ArcsInstant) return false
        return platformInstant == other.platformInstant
    }

    companion object PlatformInstant {
        fun ofEpochMilli(millis: Long): ArcsInstant = ArcsInstant.toEpochMilli(millis)
        fun now(): ArcsInstant = PlatformInstant.now()
    }
}
