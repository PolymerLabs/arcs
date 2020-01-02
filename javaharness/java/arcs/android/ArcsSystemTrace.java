package arcs.android;

import android.os.Trace;
import android.webkit.JavascriptInterface;

/**
 * Bridging the Arcs runtime/shell to the android.os.Trace APIs.
 * {@see <a href="https://developer.android.com/reference/android/os/Trace">android.os.Trace</a>}
 *
 * TODO(ianchang):
 * Event tag-cookie pairs can be extended to implement more valuable
 * performance metrics i.e. latency stats (percentile, average and so forth).
 * and also be integrated with the existing logging and profiling frameworks
 * e.g., Android StatsLog, etc.
 * {@see <a href="https://developer.android.com/reference/android/util/StatsLog">Android StatsLog</a>}
 */
final class ArcsSystemTrace {
  public ArcsSystemTrace() {
  }

  @JavascriptInterface
  public void asyncTraceBegin(String tag, int cookie) {
    Trace.beginAsyncSection(tag, cookie);
  }

  @JavascriptInterface
  public void asyncTraceEnd(String tag, int cookie) {
    Trace.endAsyncSection(tag, cookie);
  }
}
