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

/**
 * Parser for the output of /sys/kernel/debug/binder/stats file.
 */
class AndroidBinderStatsParser {

  companion object {
    private const val PROCESS_TAG = "proc "
  }

  /**
   * Parses binder stats extracting entries for a given PID.
   */
  fun parse(lines: Sequence<String>, pid: Int): Map<String, String> {
    val delimiter = PROCESS_TAG + pid
    var partitionFlip = false
    return lines.partition {
      if (it.startsWith(PROCESS_TAG)) {
        partitionFlip = it == delimiter
      }
      partitionFlip
    }.first.associate {
      // General case where a binder process record is delimited by a colon.
      var index = it.lastIndexOf(":")
      if (index != -1) {
        return@associate it.substring(0, index).trim() to
          it.substring(index + 1).trim()
      }

      // Special case e.g. "ready threads N", "free async space M"
      index = it.lastIndexOf(" ")
      if (index != -1) {
        return@associate it.substring(0, index).trim() to
          it.substring(index + 1).trim()
      }

      it.trim() to ""
    }
  }
}
