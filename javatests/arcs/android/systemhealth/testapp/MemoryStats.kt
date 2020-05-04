package arcs.android.systemhealth.testapp

import android.os.Debug

/**
 * Don't use apis of [arcs.core.util.performance.MemoryStats] to track memory stats as
 * the system health test app/services aim to find out memory leakage of Arcs storage stack
 * as well as ProdEx stack where we care about the usage of private-dirty dalvik heap excluding
 * the proportional pss usage counted for boot.img.
 */
object MemoryStats {
    val appJvmHeapKbytes: Long
        get() = with(Debug.MemoryInfo().apply { Debug.getMemoryInfo(this) }) {
            dalvikPrivateDirty.toLong()
        }
}
