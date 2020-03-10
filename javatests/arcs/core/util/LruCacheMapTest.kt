package arcs.core.util

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [LruCacheMap]. */
@RunWith(JUnit4::class)
class LruCacheMapTest {

    @Test
    fun lruCache_neverExceeds_Capacity() {
        val capacity = 5
        val cache = LruCacheMap<String, String>(capacity)

        for (x in 1..(capacity * 2)) {
            cache.put("key$x", "value$x")
            assertThat(cache.size).isLessThan(capacity + 1)
        }
    }

    @Test
    fun lruCache_containsOnly_newestEntries() {
        val capacity = 5
        val cache = LruCacheMap<String, String>(capacity)

        for (x in 1..(capacity * 2)) {
            cache.put("key$x", "value$x")
        }

        for (x in 1..capacity) {
            assertThat(cache).doesNotContainEntry("key$x", "value$x")
        }

        for (x in (capacity + 1)..(capacity * 2)) {
            assertThat(cache).containsEntry("key$x", "value$x")
        }
    }

    @Test
    fun lruCache_calls_onEvict_for_evictedEntries() {
        val capacity = 5
        val shouldBeEvicted: MutableMap<String, String> = mutableMapOf()

        for (x in 1..capacity) {
            shouldBeEvicted.put("key$x", "value$x")
        }

        val cache = LruCacheMap<String, String>(capacity) { key, value ->
            assertThat(key).isIn(shouldBeEvicted.keys)
            assertThat(value).isIn(shouldBeEvicted.values)
        }

        for (x in 1..(capacity * 2)) {
            cache.put("key$x", "value$x")
        }

        for (x in (capacity + 1)..(capacity * 2)) {
            assertThat(cache).containsEntry("key$x", "value$x")
        }
    }
}
