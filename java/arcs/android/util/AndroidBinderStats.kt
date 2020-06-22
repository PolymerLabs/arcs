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
    private const val PROCESS_TAG = "proc "
    private val log = TaggedLog { "AndroidBinderStats" }

    /** Query the stats of the given binder process record [tags]. */
    fun query(vararg tags: String): List<String> = with(parse()) {
        tags.map { this[it] ?: "" }
    }

    private fun parse(): Map<String, String> {
        return try {
            File(STATS_FILE_NODE).useLines { lines ->
                val delimiter = PROCESS_TAG + Process.myPid()
                var partitionFlip = false
                lines.partition {
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
        } catch (e: Exception) {
            // The possible reasons could be Linux debugfs is not mounted on some Android
            // devices and builds, denial of permission, etc.
            log.warning { e.message ?: "Unknown exception on accessing $STATS_FILE_NODE" }
            emptyMap()
        }
    }
}
