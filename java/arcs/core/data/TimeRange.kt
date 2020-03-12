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

package arcs.core.data

/**
 * [TimeRange] represents a range of time in milliseconds with either start or end or none or both.
 */
data class TimeRange(val startMillis: Long? = null, val endMillis: Long? = null) {
    fun inRange(timeMillis: Long): Boolean {
        return timeMillis != RawEntity.UNINITIALIZED_TIMESTAMP &&
            (startMillis?.let { timeMillis > startMillis } ?: true) &&
            (endMillis?.let { timeMillis < endMillis } ?: true)
    }
}
