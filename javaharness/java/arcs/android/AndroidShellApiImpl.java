package arcs.android;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;

import javax.inject.Inject;

import arcs.api.ShellApi;

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
      new Handler(Looper.getMainLooper())
          .post(() -> webView.evaluateJavascript(script, (String unused) -> {}));
    } else {
      Log.e("Arcs", "webView is null");
    }
    return "1";
  }
}
