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
 * Provides a platform-independent version of [ArcsDuration]
 * from java.time.Duration.
 */
class ArcsDuration(val millis: Long) {
    fun toMillis(): Long = millis

    override fun toString(): String = millis.toString()
    override fun equals(other: Any?): Boolean {
        if (other == null || other !is ArcsDuration) return false
        return millis == other.millis
    }

    companion object {
        fun ofDays(days: Long): ArcsDuration = PlatformDurationProvider.ofDays(days)
    }
}
