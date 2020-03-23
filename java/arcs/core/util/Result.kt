/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.util

/** Simple success/failure result type. */
sealed class Result<T> {
    class Ok<T>(val value: T) : Result<T>()
    class Err<T>(val thrown: Throwable) : Result<T>()
}

/** Returns a [Result] object after trying to execute a block which returns [T]. */
fun <T> resultOf(block: () -> T): Result<T> = try {
    Result.Ok(block())
} catch (e: Throwable) {
    Result.Err(e)
}

/** Returns a [Result] object after trying to execute a suspending block which returns [T]. */
suspend fun <T> resultOfSuspend(block: suspend () -> T): Result<T> = try {
    Result.Ok(block())
} catch (e: Throwable) {
    Result.Err(e)
}

/**
 * If this is [Result.Err], rethrows the wrapped exception. Otherwise, returns the wrapped value.
 *
 * This extension method can be used with [arcs.core.util.resultOf] to short-circuit the execution
 * of a block of code. e.g.,
 *
 * resultOf {
 *     val resultX = ...
 *     val resultY = ...
 *     val x = resultX.getOrThrow() // if resultX is [Result.err], we break control here.
 *     val y = resultY.getOrThrow()
 *     val z = foo(x, y) // x and y are unwrapped here.
 * }
 */
fun <T> Result<T>.getOrThrow(): T = when (this) {
    is Result.Ok -> value
    is Result.Err -> throw thrown
}

/** Returns the wrapped value if [Result.Ok]. Otherwise, returns null. */
fun <T> Result<T>.getOrNull(): T? = when (this) {
    is Result.Ok -> value
    is Result.Err -> null
}
