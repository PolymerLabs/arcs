package arcs.core.util

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [LruCacheMap]. */
@RunWith(JUnit4::class)
class LruCacheMapTest {

    @Test
    fun lruCache_neverExceeds_capacity() {
        val cache = LruCacheMap<String, String>(5)

        for (x in 1..10) {
            cache.put("key$x", "value$x")
            assertThat(cache.size).isAtMost(10)
        }
    }

    @Test
    fun lruCache_containsOnly_newestEntries() {
        val cache = LruCacheMap<String, String>(5)

        for (x in 1..10) {
            cache.put("key$x", "value$x")
        }

        for (x in 1..5) {
            assertThat(cache).doesNotContainKey("key$x")
        }

        for (x in 6..10) {
            assertThat(cache).containsEntry("key$x", "value$x")
        }
    }

    @Test
    fun lruCache_calls_onEvict_for_evictedEntries() {
        val shouldBeEvicted: MutableMap<String, String> = mutableMapOf()

        for (x in 1..5) {
            shouldBeEvicted.put("key$x", "value$x")
        }

        val cache = LruCacheMap<String, String>(5) { key, value ->
            assertThat(key).isIn(shouldBeEvicted.keys)
            assertThat(value).isIn(shouldBeEvicted.values)
        }

        for (x in 1..10) {
            cache.put("key$x", "value$x")
        }

        for (x in 6..10) {
            assertThat(cache).containsEntry("key$x", "value$x")
        }
    }
}
