package arcs.android.impl;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayList;
import java.util.List;

import javax.inject.Inject;
import javax.inject.Provider;
import javax.inject.Singleton;

import arcs.api.PecPortManager;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.RuntimeSettings;
import arcs.api.ShellApi;
import arcs.api.UiBroker;

/**
 * Android environment hosting Constants runtime.
 */
@Singleton
public final class AndroidArcsEnvironment {

  public interface ReadyListener {
    void onReady(List<String> recipes);
  }

  private static final String FIELD_MESSAGE = "message";
  private static final String MESSAGE_READY = "ready";
  private static final String FIELD_READY_RECIPES = "recipes";
  private static final String MESSAGE_DATA = "data";
  private static final String MESSAGE_OUTPUT = "output";
  private static final String MESSAGE_PEC = "pec";
  private static final String FIELD_TRANSACTION_ID = "tid";
  private static final String FIELD_DATA = "data";
  private static final String FIELD_PEC_ID = "id";
  private static final String FIELD_SESSION_ID = "sessionId";

  private final List<ReadyListener> readyListeners = new ArrayList<>();
  private final PortableJsonParser jsonParser;
  private final PecPortManager pecPortManager;
  private final UiBroker uiBroker;
  private final ShellApi shellApi;
  private final Handler uiThreadHandler;
  private WebView webView;
  // Fetches the up-to-date properties on every get().
  private Provider<RuntimeSettings> runtimeSettings;

  @Inject
  public AndroidArcsEnvironment(
      PortableJsonParser jsonParser,
      PecPortManager pecPortManager,
      UiBroker uiBroker,
      ShellApi shellApi,
      Provider<RuntimeSettings> runtimeSettings) {
    this.jsonParser = jsonParser;
    this.pecPortManager = pecPortManager;
    this.uiBroker = uiBroker;
    this.shellApi = shellApi;
    this.runtimeSettings = runtimeSettings;

    this.uiThreadHandler = new Handler(Looper.getMainLooper());
  }

  public void addReadyListener(ReadyListener listener) {
    readyListeners.add(listener);
  }

  public void fireReadyEvent(List<String> recipes) {
    readyListeners.forEach(listener -> listener.onReady(recipes));
  }

  public void init(Context context) {
    webView = new WebView(context);
    webView.setVisibility(View.GONE);
    webView.getSettings().setAppCacheEnabled(false);
    webView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
    webView.clearCache(true);
    webView.setWebContentsDebuggingEnabled(true);

    WebSettings arcsSettings = webView.getSettings();
    arcsSettings.setDatabaseEnabled(true);
    arcsSettings.setGeolocationEnabled(true);
    arcsSettings.setJavaScriptEnabled(true);
    arcsSettings.setDomStorageEnabled(true);
    arcsSettings.setSafeBrowsingEnabled(false);
    // These two are needed for file:// URLs to work and load subresources
    arcsSettings.setAllowFileAccessFromFileURLs(true);
    // needed to allow WebWorkers to work in FileURLs.
    arcsSettings.setAllowUniversalAccessFromFileURLs(true);

    webView.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return super.shouldInterceptRequest(view, request);
      }
    });

    webView.addJavascriptInterface(this, "DeviceClient");

    shellApi.attachProxy(this::sendMessageToArcs);

    RuntimeSettings settings = runtimeSettings.get();
    // If using any of the host shells, i.e. pipe-shells at the host:
    // http://localhost:8786/shells/pipes-shell/web/deploy/dist/?
    // adding the following attribute to allow HTTP connection(s) at
    // <application> in service/AndroidManifest.xml:
    //    android:usesCleartextTraffic="true"
    String url = settings.shellUrl();
    url += "log=" + settings.logLevel();
    if (settings.useDevServerProxy()) {
      url += "&explore-proxy";
    }

    Log.i("Constants", "runtime url: " + url);
    webView.loadUrl(url);
  }

  public void reset() {}

  public void destroy() {}

  @JavascriptInterface
  public void receive(String json) {
    PortableJson content = jsonParser.parse(json);
    String message = content.getString(FIELD_MESSAGE);
    switch (message) {
      case MESSAGE_READY:
        fireReadyEvent(content.getArray(FIELD_READY_RECIPES).asStringArray());
        break;
      case MESSAGE_DATA:
        break;
      case MESSAGE_PEC:
        PortableJson data = content.getObject(FIELD_DATA);
        String pecId = data.getString(FIELD_PEC_ID);
        String sessionId =
            data.hasKey(FIELD_SESSION_ID) ? data.getString(FIELD_SESSION_ID) : null;
        pecPortManager.deliverPecMessage(pecId, sessionId, data);
        break;
      case MESSAGE_OUTPUT:
        uiBroker.render(content.getObject(FIELD_DATA));
        break;
      default:
        throw new AssertionError("Received unsupported message: " + message);
    }
  }

  private void sendMessageToArcs(String msg) {
    String escapedEnvelope = msg.replace("\\\"", "\\\\\"");
    String script = String.format("ShellApi.receive('%s');", escapedEnvelope);

    if (webView != null) {
      // evaluateJavascript runs asynchronously by default
      // and must be used from the UI thread
      uiThreadHandler.post(
          () -> webView.evaluateJavascript(script, (String unused) -> {}));
    } else {
      Log.e("Constants", "webView is null");
    }
  }
}
