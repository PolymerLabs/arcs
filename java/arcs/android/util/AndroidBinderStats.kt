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

import android.os.Process
import arcs.core.util.TaggedLog
import java.io.File

/**
 * An utility singleton queries binder stats directly from the kernel binder driver.
 *
 * Note:
 * If a permission denial shows up at i.e. a privileged application, try to execute the command
 * to configure secure Linux to permissive mode:
 * $> adb shell setenforce 0
 *
 * By default, a privileged application is disallowed to access any debugfs file attributes.
 * neverallow priv_app debugfs:file read;
 */
object AndroidBinderStats {
  private const val STATS_FILE_NODE = "/sys/kernel/debug/binder/stats"
  private val log = TaggedLog { "AndroidBinderStats" }
  private val parser = AndroidBinderStatsParser()

  /** Query the stats of the given binder process record [tags]. */
  fun query(vararg tags: String): List<String> = with(
    parser.parse(readBinderStats(), Process.myPid())
  ) {
    tags.map { this[it] ?: "" }
  }

  private fun readBinderStats(): Sequence<String> {
    return try {
      File(STATS_FILE_NODE).bufferedReader().lineSequence()
    } catch (e: Exception) {
      // The possible reasons could be Linux debugfs is not mounted on some Android
      // devices and builds, denial of permission, etc.
      log.warning { e.message ?: "Unknown exception on accessing $STATS_FILE_NODE" }
      emptySequence()
    }
  }
}
