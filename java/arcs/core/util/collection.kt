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

/** Implementation of Java's `compute` which expects, and returns, a non-null result. */
fun <K, V> MutableMap<K, V>.computeNotNull(key: K, updater: (K, V?) -> V): V =
    updater(key, this[key]).also { this[key] = it }
