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

/**
 * An extremely simple [MutableMap] with an LRU policy. Leverages [LinkedHashMap] to maintain
 * order and remove oldest entries which are the first entries returned from the iterator.
 *
 * @property capacity the maximum capacity of the cache.
 * @property onEvict called on each item evicted.
 */
class LruCacheMap<K, V>(
    val capacity: Int = 100,
    private val backingMap: LinkedHashMap<K, V> = linkedMapOf(),
    val onEvict: ((K, V) -> Unit)? = null
) : MutableMap<K, V> by backingMap {

    override fun put(key: K, value: V): V? {
        val previousValue = backingMap.get(key)
        if (backingMap.size >= capacity) {
            val iterator = backingMap.entries.iterator()
            repeat(backingMap.size - capacity + 1) {
                if (iterator.hasNext()) {
                    val entry = iterator.next()
                    iterator.remove()
                    onEvict?.let { it(entry.key, entry.value) }
                } else {
                    return@repeat
                }
            }
        }
        backingMap.put(key, value)
        return previousValue
    }

    override fun get(key: K): V? {
        val value = backingMap.get(key)?.let {
            // remove and put moves entry to end of internal linked list
            backingMap.remove(key)
            backingMap.put(key, it)
            it
        }
        return value
    }
}
