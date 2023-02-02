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
  val ttlConfig: TtlConfig = TtlConfig(),
  val livenessPredicate: ((K, V) -> Boolean) = { _, _ -> true },
  val onEvict: ((K, V) -> Unit)? = null
) : MutableMap<K, V> by backingMap {
  /**
   * Specifies the ttl for a cache entry in millis, or 0 for never, and a function that returns
   * the current time in millis.
   */
  data class TtlConfig(val ttlMilliseconds: Long, val currentTimeMillis: () -> Long) {
    constructor() : this(0, { -1L })
  }

  private val ttlMap: MutableMap<K, Long> = mutableMapOf()

  private val ttlEnabled get() = ttlConfig.ttlMilliseconds > 0

  private fun now() = ttlConfig.currentTimeMillis()

  private fun expired(key: K, now: Long): Boolean {
    val ttl = requireNotNull(ttlMap[key]) {
      "Missing ttl entry for $key"
    }
    return ttlEnabled && now - ttl > ttlConfig.ttlMilliseconds
  }

  private fun updateEntry(key: K, value: V, now: Long) {
    backingMap[key] = value
    ttlMap[key] = now
  }

  private fun postRemoveEntry(key: K, value: V) {
    ttlMap.remove(key)
    onEvict?.let { it(key, value) }
  }

  private fun expireEntries() {
    if (ttlEnabled) {
      val now = now()
      val iterator = backingMap.entries.iterator()
      while (iterator.hasNext()) {
        val entry = iterator.next()
        if (expired(entry.key, now)) {
          iterator.remove()
          postRemoveEntry(entry.key, entry.value)
        } else {
          break
        }
      }
    }
  }

  override fun put(key: K, value: V): V? {
    val previousValue = backingMap[key]
    if (backingMap.size >= capacity) {
      val iterator = backingMap.entries.iterator()
      repeat(backingMap.size - capacity + 1) {
        if (iterator.hasNext()) {
          val entry = iterator.next()
          iterator.remove()
          postRemoveEntry(entry.key, entry.value)
        } else {
          return@repeat
        }
      }
    }
    updateEntry(key, value, now())
    return previousValue
  }

  override fun get(key: K): V? {
    return backingMap[key]?.let {
      // remove and put moves entry to end of internal linked list
      backingMap.remove(key)
      val now = now()
      val value = if (this.livenessPredicate(key, it) && !expired(key, now)) {
        updateEntry(key, it, now)
        it
      } else {
        postRemoveEntry(key, it)
        null
      }
      expireEntries()
      return value
    }
  }
}
