package arcs.android.util.testutil

import android.util.Log as AndroidLog
import arcs.core.util.Log
import arcs.core.util.testutil.LogRule
import org.robolectric.shadows.ShadowLog

/** TestRule which wrappers around [LogRule] and disable some database-related spammy tags. */
class AndroidLogRule(logLevel: Log.Level = Log.Level.Debug) : LogRule(logLevel) {
  init {
    ShadowLog.setLoggable("CursorWindowStats", AndroidLog.WARN)
    ShadowLog.setLoggable("SQLiteCursor", AndroidLog.WARN)
  }
}
