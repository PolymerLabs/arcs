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

/** A [Timer] times the execution of an operation. */
abstract class Timer {
    /** The current time, in milliseconds past the Epoch. Implementations will vary by platform. */
    abstract val currentTimeNanos: Long

    /** Times the execution of the given [block]. */
    inline fun <T> time(crossinline block: () -> T): TimedResult<T> {
        val startTime = currentTimeNanos
        val endTime: Long
        val result = try {
            block()
        } finally {
            endTime = currentTimeNanos
        }
        return TimedResult(
            result,
            endTime - startTime
        )
    }

    /** Times the exeuction of the given suspending [block]. */
    @Suppress("REDUNDANT_INLINE_SUSPEND_FUNCTION_TYPE") // It's not redundant.
    suspend inline fun <T> timeSuspending(block: suspend () -> T): TimedResult<T> {
        val startTime = currentTimeNanos
        val endTime: Long
        val result = try {
            block()
        } finally {
            endTime = currentTimeNanos
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
