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

import arcs.jvm.util.JvmTime
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class TimerTest {
  private lateinit var timer: Timer

  @Before
  fun setUp() {
    timer = Timer(JvmTime)
  }

  @After
  fun tearDown() {
    TimingMeasurements.reset()
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
  fun timeSuspending_calculatesRuntime_andReturnsResult() = runBlocking {
    val (result, durationNanos) = timer.timeSuspending {
      delay(500)
      return@timeSuspending 5
    }

    assertThat(result).isEqualTo(5)
    assertThat(durationNanos).isAtLeast(500 * 1000 * 1000)
  }

  @Test
  fun timeAndLog_recordsTime() {
    val result = timer.timeAndLog("x") {
      Thread.sleep(500)
      return@timeAndLog 5
    }

    assertThat(result).isEqualTo(5)
    assertThat(TimingMeasurements.get().keys).containsExactly("x")
    assertThat(TimingMeasurements.get().getValue("x").single()).isAtLeast(500L)
  }

  @Test
  fun timeAndLogSuspending_recordsTime() = runBlocking<Unit> {
    val result = timer.timeAndLogSuspending("x") {
      delay(500)
      return@timeAndLogSuspending 5
    }

    assertThat(result).isEqualTo(5)
    assertThat(TimingMeasurements.get().keys).containsExactly("x")
    assertThat(TimingMeasurements.get().getValue("x").single()).isAtLeast(500L)
  }
}
