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

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class AndroidBinderStatsParserTest {

  private val parser = AndroidBinderStatsParser()

  @Test
  fun globalStatsAreIgnored() {
    val parsed = parser.parse(BINDER_STATS_OUTPUT, 6218)

    assertThat(parsed).doesNotContainKey("BC_TRANSACTION")
    assertThat(parsed).doesNotContainKey("BC_REPLY")
    assertThat(parsed).doesNotContainKey("thread")
  }

  @Test
  fun returnsStatsForTheRequestedProcess() {
    assertThat(parser.parse(BINDER_STATS_OUTPUT, 6218)).containsEntry("threads", "5")
    assertThat(parser.parse(BINDER_STATS_OUTPUT, 6127)).containsEntry("threads", "6")
    assertThat(parser.parse(BINDER_STATS_OUTPUT, 6019)).containsEntry("threads", "8")
  }

  @Test
  fun parsesColonSeparatedStats() {
    val parsed = parser.parse(BINDER_STATS_OUTPUT, 6127)
    assertThat(parsed).containsEntry("threads", "6")
    assertThat(parsed).containsEntry("requested threads", "0+4/15")
  }

  @Test
  fun parsesSpaceSeparatedStats() {
    val parsed = parser.parse(BINDER_STATS_OUTPUT, 6127)
    assertThat(parsed).containsEntry("ready threads", "5")
    assertThat(parsed).containsEntry("free async space", "520192")
  }

  companion object {
    val BINDER_STATS_OUTPUT = """
      binder stats:
      BC_TRANSACTION: 5956574
      BC_REPLY: 3861012
      proc: active 152 total 5492
      thread: active 1152 total 58201
      proc 6218
      context binder
        threads: 5
        requested threads: 0+2/15
        ready threads 3
        free async space 320192
      proc 6127
      context binder
        threads: 6
        requested threads: 0+4/15
        ready threads 5
        free async space 520192
      proc 6019
      context binder
        threads: 8
        requested threads: 0+3/15
        ready threads 4
        free async space 2024
    """.trimIndent().splitToSequence("\n")
  }
}
