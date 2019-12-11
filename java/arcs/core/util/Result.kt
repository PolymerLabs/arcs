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
