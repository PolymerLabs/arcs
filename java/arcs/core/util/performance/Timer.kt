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

package arcs.core.util.performance

import arcs.core.util.Time

/** A [Timer] times the execution of an operation. */
class Timer(val time: Time) {
    /** Times the execution of the given [block]. */
    inline fun <T> time(crossinline block: () -> T): TimedResult<T> {
        val startTime = time.currentTimeNanos
        val endTime: Long
        val result = try {
            block()
        } finally {
            endTime = time.currentTimeNanos
        }
        return TimedResult(
            result,
            endTime - startTime
        )
    }

    /** Times the exeuction of the given suspending [block]. */
    @Suppress("REDUNDANT_INLINE_SUSPEND_FUNCTION_TYPE") // It's not redundant.
    suspend inline fun <T> timeSuspending(block: suspend () -> T): TimedResult<T> {
        val startTime = time.currentTimeNanos
        val endTime: Long
        val result = try {
            block()
        } finally {
            endTime = time.currentTimeNanos
        }
        return TimedResult(
            result,
            endTime - startTime
        )
    }
}

/**
 * Wrapper for the result of a timed operation, along with the total elapsed milliseconds required
 * for the operation.
 */
data class TimedResult<T>(val result: T, val elapsedNanos: Long)
