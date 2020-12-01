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

/** Simple success/failure result type. */
sealed class Result<T> {
  /** Returns [T] if the result is [Ok], otherwise throws the failure exception. */
  abstract fun unwrap(): T

  /** Returns [T] if the result is [Ok], otherwise returns null. */
  abstract fun get(): T?

  data class Ok<T>(val value: T) : Result<T>() {
    override fun unwrap(): T = value

    override fun get(): T? = value
  }

  data class Err<T>(val thrown: Throwable) : Result<T>() {
    override fun unwrap(): T {
      throw thrown
    }

    override fun get(): T? = null
  }
}

/** Returns a [Result] object after trying to execute a block which returns [T]. */
inline fun <T> resultOf(block: () -> T): Result<T> {
  return try {
    Result.Ok(block())
  } catch (e: Throwable) {
    Result.Err(e)
  }
}
