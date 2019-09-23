package arcs.android.impl;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;
import arcs.api.ShellApi;
import javax.inject.Inject;

/** Exposes Shell (Window) scope methods into Java from JS. */
public class AndroidShellApiImpl implements ShellApi {

  private WebView webView;

  @Inject
  public AndroidShellApiImpl(WebView webView) {
    this.webView = webView;
  }

  @Override
  public String receive(String json) {
    String escapedEnvelope = json.replace("\\\"", "\\\\\"");

    String script = String.format("ShellApi.receive('%s');", escapedEnvelope);
    Log.e("Arcs", "Receive called " + script);

    if (webView != null) {
      // TODO(cromwellian): receive() should take a callback since the
      // TID cannot be provided synchronously on Android
      new Handler(Looper.getMainLooper())
          .post(
              () ->
                  webView.evaluateJavascript(
                      script,
                      (String tid) -> {
                        // TODO: deprecated tid callback.
                      }));
    } else {
      Log.e("Arcs", "webView is null");
    }
    return "1";
  }
}
