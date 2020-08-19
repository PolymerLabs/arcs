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
 * Provides a platform-independent version of [Instant]
 * from java.time.Instant.
 */
class Instant(val millis: Long) {
    fun toEpochMilli(): Long = millis

    companion object PlatformInstant {
        fun ofEpochMilli(millis: Long): Instant = PlatformInstantProvider.ofEpochMilli(millis)
        fun now(): Instant = PlatformInstantProvider.now()
    }
}
