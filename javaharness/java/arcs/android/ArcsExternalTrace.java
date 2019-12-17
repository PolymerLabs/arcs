package arcs.android;

import android.os.Trace;
import android.webkit.JavascriptInterface;

/**
 * Bridging the android.os.Trace APIs to the Arcs runtime/shell.
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
