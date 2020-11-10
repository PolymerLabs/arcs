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

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Runs a given suspending block of code inside a coroutine with a specified timeout and throws a
 * [TaggedTimeoutException] if the timeout was exceeded. This is basically the same as withTimeout
 * but adds a custom message tag and provides a better stack trace.
 */
suspend inline fun <T> withTaggedTimeout(
  timeMillis: Long,
  messageBuilder: () -> String,
  crossinline block: suspend CoroutineScope.() -> T
): T? {
  val result = withTimeoutOrNull(timeMillis) {
    block()
  }
  if (result == null) {
    throw TaggedTimeoutException("Timed out after $timeMillis ms: ${messageBuilder()}")
  }
  return result
}

class TaggedTimeoutException(msg: String) : RuntimeException(msg)
