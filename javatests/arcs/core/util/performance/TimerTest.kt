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

import arcs.core.util.Time
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class TimerTest {
    private lateinit var timer: Timer
    @Before
    fun setUp() {
        timer = Timer(TimeImpl())
    }

    @Test
    fun time_calculatesRuntime_andReturnsResult() {
        val (result, durationNanos) = timer.time {
            Thread.sleep(500)
            return@time 5
        }

        assertThat(result).isEqualTo(5)
        assertThat(durationNanos).isAtLeast(500 * 1000 * 1000)
    }

    @Test
    fun time_suspending_calculatesRuntime_andReturnsResult() = runBlocking {
        val (result, durationNanos) = timer.timeSuspending {
            delay(500)
            return@timeSuspending 5
        }

        assertThat(result).isEqualTo(5)
        assertThat(durationNanos).isAtLeast(500 * 1000 * 1000)
    }

    private class TimeImpl : Time() {
        override val currentTimeNanos: Long
            get() = System.nanoTime()
        override val currentTimeMillis: Long
            get() = System.currentTimeMillis()
    }
}
