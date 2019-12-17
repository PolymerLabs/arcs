package arcs.android;

import android.os.Trace;
import android.webkit.JavascriptInterface;

/**
 * Bridging the android.os.Trace APIs to the Arcs runtime/shell.
 *
 * TODO:
 * Event tag-cookie pairs can be extended to implement more valuable
 * performance metrics i.e. latency stats (percentile, average and so forth).
 * The metrics can also be integrated with the existing logging and profiling
 * frameworks e.g., westworld, perfgate and so on.
 */
public final class ArcsExternalTrace {

  public ArcsExternalTrace() {}

  @JavascriptInterface
  public void asyncTraceBegin(String tag, int cookie) {
    Trace.beginAsyncSection(tag, cookie);
  }

  @JavascriptInterface
  public void asyncTraceEnd(String tag, int cookie) {
    Trace.endAsyncSection(tag, cookie);
  }
}
