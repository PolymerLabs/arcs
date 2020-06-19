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

package arcs.android.util

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

import arcs.android.util.initLogForAndroid
import arcs.core.util.Log

/** Tests for [AndroidLog]. */
@RunWith(AndroidJUnit4::class)
class AndroidLogTest {
  @Suppress("UNUSED_PARAMETER")
  private class FakeWriter {
    var level : Log.Level? = null
    var message = ""

    fun write(level: Log.Level, message: String, throwable: Throwable?) {
      this.level = level
      this.message = message
    }
  }

  @Test
  fun log_verbose() {
    initLogForAndroid(Log.Level.Verbose)
    val writer = FakeWriter()
    Log.writer = writer::write
    Log.verbose { "Foo" }
    assertThat(writer.level).isEqualTo(Log.Level.Verbose)
    assertThat(writer.message).isEqualTo("Foo")
  }

  @Test
  fun log_debug() {
    initLogForAndroid(Log.Level.Debug)
    val writer = FakeWriter()
    Log.writer = writer::write
    Log.debug { "Foo" }
    assertThat(writer.level).isEqualTo(Log.Level.Debug)
    assertThat(writer.message).isEqualTo("Foo")
  }

  @Test
  fun log_verboseAndDebug() {
    initLogForAndroid(Log.Level.Verbose)
    val writer = FakeWriter()
    Log.writer = writer::write
    Log.verbose { "Foo" }
    assertThat(writer.level).isEqualTo(Log.Level.Verbose)
    assertThat(writer.message).isEqualTo("Foo")
    Log.debug { "Bar" }
    assertThat(writer.level).isEqualTo(Log.Level.Debug)
    assertThat(writer.message).isEqualTo("Bar")
  }

  @Test
  fun log_verboseSkippedAtDebugLevel() {
    initLogForAndroid(Log.Level.Debug)
    val writer = FakeWriter()
    Log.writer = writer::write
    Log.verbose { "Foo" }
    assertThat(writer.level).isNull()
    assertThat(writer.message).isEmpty()
    Log.debug { "Bar" }
    assertThat(writer.level).isEqualTo(Log.Level.Debug)
    assertThat(writer.message).isEqualTo("Bar")
  }
}
