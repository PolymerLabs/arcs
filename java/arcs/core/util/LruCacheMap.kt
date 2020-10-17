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

import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update

/**
 * An extremely simple [MutableMap] with an LRU policy. Leverages [LinkedHashMap] to maintain
 * order and remove oldest entries which are the first entries returned from the iterator. A
 * [livenessPredicate] additionally allows entries to be removed during retrieval, or later,
 * with a periodic cleanup task, if they are no longer usable (e.g. closed, tombstones, etc)
 * regardless of whether the cache is at maximum capacity or not, or if they were recently used.
 *
 * @property capacity the maximum capacity of the cache.
 * @property livenessPredicate return true if the entry may be removed even if recently used
 * @property onEvict called on each item evicted.
 */
open class LruCacheMap<K, V>(
  val capacity: Int = 100,
  private val backingMap: LinkedHashMap<K, V> = linkedMapOf(),
  val livenessPredicate: ((K, V) -> Boolean) = { _, _ -> true },
  val evictor: ((() -> Unit) -> Unit) = { it() },
  val onEvict: ((K, V) -> Unit)? = null
) : MutableMap<K, V> by backingMap {

  private val pendingEviction = atomic(mapOf<K, V>())

  override fun put(key: K, value: V): V? {
    val previousValue = backingMap.get(key)
    if (backingMap.size >= capacity) {
      val iterator = backingMap.entries.iterator()
      repeat(backingMap.size - capacity + 1) {
        if (iterator.hasNext()) {
          val entry = iterator.next()
          scheduleEviction(entry.key, entry.value)
          iterator.remove()
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
      if (livenessPredicate(key, it)) {
        backingMap.put(key, it)
        return it
      } else {
        scheduleEviction(key, it)
        return pendingEviction.value.get(key)
      }
    }
    return value
  }

  private fun runEvictor(key: K, value: V) {
    evictor {
      onEvict?.invoke(key, value)
      pendingEviction.update { oldMap ->
        oldMap.toMutableMap().also {
          it.remove(key)
        }
      }
    }
  }

  private fun scheduleEviction(key: K, value: V) {
    pendingEviction.update { oldMap ->
      oldMap.toMutableMap().also {
        it[key] = value
      }
    }
    runEvictor(key, value)
  }
}
