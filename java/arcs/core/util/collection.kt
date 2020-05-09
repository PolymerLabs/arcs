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

/**
 * Returns a map obtained by merging [this] map with [that] map by applying [combine] for values.
 *
 * The [combine] function is passed a key and the corresponding values from both the maps. If a key
 * is absent in a map, the corresponding value argument to [combine] is set to `null`. The result
 * of the [combine] function is used as the value for the key in the returned map. If [combine]
 * returns null, the corresponding key is ignored in the result.
 *
 * Here is an example usage:
 * ```
 * val result = m1.mergeWith(m2) { k, v1, v2 ->
 *     when {
 *         v1 != null && v2 != null -> // k is present in both maps
 *         v1 != null -> // k is only present in m1
 *         v2 != null -> // k is only present in m2
 *         else -> // should never happen.
 *     }
 * }
 * ```
 */
fun <K, V> Map<K, V>.mergeWith(
    that: Map<K, V>,
    combine: (K, V?, V?) -> V?
): Map<K, V> {
    val thisKeys = this.asSequence()
        .mapNotNull { (key, value) ->
            combine(key, value, that[key])?.let { result -> key to result }
        }
    val thatOnlyKeys = that.asSequence()
        .filter { this[it.key] == null }
        .mapNotNull { (key, value) ->
            combine(key, null, value)?.let { result -> key to result }
        }
    return (thisKeys + thatOnlyKeys).toMap()
}
