package arcs.android.impl;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;
import arcs.api.ArcsEnvironment.DataListener;
import arcs.api.ShellApi;
import java.util.Map;
import javax.inject.Inject;

/** Exposes Shell (Window) scope methods into Java from JS. */
public class AndroidShellApiImpl implements ShellApi {

  private static final String ARCS_API_NAME = "DeviceClient";
  private static final String READY_MESSAGE = "ready";
  private static final String SUGGESTIONS_MESSAGE = "suggestions";
  private static final String MESSAGE_FIELD_NAME = "message";
  private static final String TID_FIELD_NAME = "tid";
  private static final String DYNAMIC_MANIFEST_URL =
      "file:///android_asset/pipes-shell/dynamic.manifest";
  private Context context;
  private Map<String, DataListener> inProgress;

  @Inject
  public AndroidShellApiImpl(Map<String, DataListener> inProgress) {
    this.inProgress = inProgress;
  }

  private WebView webView;

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
                        if (inProgress.containsKey(tid)) {}
                      }));
    } else {
      Log.e("Arcs", "webView is null");
    }
    return "1";
  }

  public void setWebKit(WebView arcsWebView) {
    webView = arcsWebView;
  }
}
