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

package arcs.crdt

/** Exception describing an issue which has occurred while working with CRDT data. */
class CrdtException(message: String, cause: Throwable? = null) : Exception(message, cause) {
  companion object {
    /**
     * Checker that can throw a [CrdtException] when the provided [value] is null, or return a
     * non-nullable type of the value if it's not null.
     */
    fun <T> requireNotNull(value: T?, lazyMessage: () -> String): T =
      value ?: throw CrdtException(lazyMessage())
  }
}
