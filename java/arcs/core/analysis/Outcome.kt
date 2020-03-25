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

package arcs.core.analysis

/** A simple sealed class that captures the outcome of an analysis. */
sealed class Outcome<T>() {
    /** Wraps the result of a successful operation. */
    class Success<T>(val value: T) : Outcome<T>()

    /** Wraps the reason for the failure of an operation. */
    class Failure<T>(val reason: String) : Outcome<T>()

    /** Returns the wrapped value on success. Otherwise, result of applying [onFailure]. */
    inline fun getOrElse(onFailure: (reason: String) -> T): T = when (this) {
        is Outcome.Success -> value
        is Outcome.Failure -> onFailure(reason)
    }

    /** Returns the wrapped value on success. Otherwise, returns null. */
    fun getOrNull(): T? = when (this) {
        is Outcome.Success -> value
        is Outcome.Failure -> null
    }

    /** Returns the reason if [this] is [Outcome.Failure]. Otherwise returns null. */
    fun getFailureReason(): String? = when (this) {
        is Outcome.Success -> null
        is Outcome.Failure -> reason
    }
}

/** A helper extension to wrap a value of type [T] in an [Outcome<T>.Success]. */
fun <T> T.toSuccess(): Outcome<T> = Outcome.Success(this)
