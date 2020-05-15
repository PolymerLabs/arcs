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

package arcs.core.util.performance

import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runBlockingTest
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import kotlin.random.Random

@Suppress("EXPERIMENTAL_API_USAGE")
@RunWith(JUnit4::class)
class CountersTest {
    @Test
    fun constructor_withVarargNames() {
        val counters = Counters("foo", "bar", "baz")

        assertThat(counters["foo"]).isEqualTo(0)
        assertThat(counters["bar"]).isEqualTo(0)
        assertThat(counters["baz"]).isEqualTo(0)
    }

    @Test
    fun constructor_withSet() {
        val counters = Counters(setOf("foo", "bar", "baz"))

        assertThat(counters["foo"]).isEqualTo(0)
        assertThat(counters["bar"]).isEqualTo(0)
        assertThat(counters["baz"]).isEqualTo(0)
    }

    @Test
    fun increment_simple() {
        val counters = Counters("foo")

        counters.increment("foo")
        counters.increment("foo")
        counters.increment("foo")

        assertThat(counters["foo"]).isEqualTo(3)
    }

    @Test
    fun increment_throws_whenCounterNotRegistered() {
        val counters = Counters("foo")

        val e = assertFailsWith<IllegalArgumentException> {
            counters.increment("bar")
        }
        assertThat(e).hasMessageThat().contains("Counter with name \"bar\" not registered")
    }

    @Test
    fun increment_concurrent() = runBlockingTest {
        val random = Random(System.currentTimeMillis())

        val counters = Counters("foo")
        val aCount = random.nextInt(1000)
        val bCount = random.nextInt(1000)
        val cCount = random.nextInt(1000)

        val jobA = launch(Dispatchers.Unconfined) {
            repeat(aCount) { counters.increment("foo") }
        }

        val jobB = launch(Dispatchers.Unconfined) {
            repeat(bCount) { counters.increment("foo") }
        }

        val jobC = launch {
            repeat(cCount) { counters.increment("foo") }
        }

        listOf(jobA, jobB, jobC).joinAll()

        assertThat(counters["foo"]).isEqualTo(aCount + bCount + cCount)
    }

    @Test
    fun get_throws_whenCounterNotRegistered() {
        val counters = Counters("foo")

        val e = assertFailsWith<IllegalArgumentException> {
            counters["bar"]
        }
        assertThat(e).hasMessageThat().contains("Counter with name \"bar\" not registered")
    }
}
