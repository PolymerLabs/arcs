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

package arcs.android.systemhealth.testapp

import android.os.Debug
import arcs.core.util.performance.MemoryIdentifier
import arcs.core.util.performance.MemoryStats as MemoryStatsUtil

/** Utility of generating statistics of memory footprint. */
object MemoryStats {
    /**
     * App-specific JVM heap usage.
     *
     * Don't use [MemoryIdentifier.JAVA_HEAP] as it counts not only app-specific private-dirty
     * dalvik heap usage but also dirty pages of boot images in current process. The former can
     * properly represent memory footprint of Arcs-specific JVM stack whereas the latter reflects
     * how many codes/heaps in boot images are visited and allocated which is not our concern.
     */
    val appJvmHeapKbytes: Long
        get() = with(Debug.MemoryInfo().apply { Debug.getMemoryInfo(this) }) {
            dalvikPrivateDirty.toLong()
        }

    /**
     * App-specific native heap usage.
     */
    val appNativeHeapKbytes: Long
        get() = MemoryStatsUtil.stat(MemoryIdentifier.NATIVE_HEAP)[0]

    /**
     * Typically is [appJvmHeapKbytes] + [appNativeHeapKbytes] + pss of boot images.
     */
    val allHeapsKbytes: Long
        get() = MemoryStatsUtil.stat(
            MemoryIdentifier.JAVA_HEAP, MemoryIdentifier.NATIVE_HEAP
        ).sum()
}
