package arcs.android;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import arcs.api.Constants;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.inject.Provider;
import javax.inject.Singleton;

import arcs.api.ArcsMessageSender;
import arcs.api.PecPortManager;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.RuntimeSettings;
import arcs.api.UiBroker;

/**
 * Android WebView based environment for Arcs runtime.
 */
@Singleton
final class AndroidArcsEnvironment {

  private static final String TAG = "Arcs";

  interface ReadyListener {
    void onReady(List<PortableJson> recipes);
  }

  private static final Logger logger =
    Logger.getLogger(AndroidArcsEnvironment.class.getName());

  private static final String DYNAMIC_MANIFEST_URL =
      "file:///android_asset/arcs/dynamic.manifest";

  private static final String FIELD_MESSAGE = "message";
  private static final String MESSAGE_READY = "ready";
  private static final String MESSAGE_CONTEXT = "context";
  private static final String FIELD_READY_RECIPES = "recipes";
  private static final String MESSAGE_DATA = "data";
  private static final String MESSAGE_OUTPUT = "output";
  private static final String MESSAGE_PEC = "pec";
  private static final String FIELD_DATA = "data";
  private static final String FIELD_PEC_ID = "id";
  private static final String FIELD_SESSION_ID = "sessionId";

  private final PortableJsonParser jsonParser;
  private final PecPortManager pecPortManager;
  private final UiBroker uiBroker;
  // Fetches the up-to-date properties on every get().
  private final Provider<RuntimeSettings> runtimeSettings;

  private final List<ReadyListener> readyListeners = new ArrayList<>();
  private final Handler uiThreadHandler = new Handler(Looper.getMainLooper());

  private WebView webView;
  private String dynamicManifest;

  AndroidArcsEnvironment(
      PortableJsonParser portableJsonParser,
      PecPortManager pecPortManager,
      UiBroker uiBroker,
      Provider<RuntimeSettings> runtimeSettings) {
    this.jsonParser = portableJsonParser;
    this.pecPortManager = pecPortManager;
    this.uiBroker = uiBroker;
    this.runtimeSettings = runtimeSettings;
  }


  void addReadyListener(ReadyListener listener) {
    readyListeners.add(listener);
  }

  void init(Context context, List<String> manifests) {
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

    dynamicManifest = manifests
        .stream()
        .map(s -> String.format("import \'%s\'", s))
        .collect(Collectors.joining("\n"));

    webView.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Log.d(TAG, "Intercepting request " + request.getUrl());
        if (TextUtils.equals(DYNAMIC_MANIFEST_URL, request.getUrl().toString())) {
          try {
            Log.d(TAG, "Intercepted dynamic manifest request, offering " + dynamicManifest);
            return new WebResourceResponse(
                "text/plain",
                "utf-8",
                new ByteArrayInputStream(dynamicManifest.getBytes(StandardCharsets.UTF_8)));
          } catch (Exception e) {
            Log.e(TAG, "Failed to return dynamic manifest.", e);
          }
        }

        return super.shouldInterceptRequest(view, request);
      }
    });

    webView.addJavascriptInterface(this, "DeviceClient");

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

    Log.i("Arcs", "runtime url: " + url);
    webView.loadUrl(url);
  }

  void destroy() {
    if (webView != null) {
      webView.destroy();
    }
    readyListeners.clear();
  }

  void sendMessageToArcs(String msg) {
    String escapedEnvelope = msg.replace("\\\"", "\\\\\"")
        .replace("'", "\\'");
    String script = String.format("ShellApi.receive('%s');", escapedEnvelope);

    if (webView != null) {
      // evaluateJavascript runs asynchronously by default
      // and must be used from the UI thread
      uiThreadHandler.post(
          () -> webView.evaluateJavascript(script, (String unused) -> {}));
    } else {
      Log.e("Arcs", "webView is null");
    }
  }

  @JavascriptInterface
  public void receive(String json) {
    uiThreadHandler.post(() -> {
      PortableJson content = jsonParser.parse(json);
      String message = content.getString(FIELD_MESSAGE);
      switch (message) {
        case MESSAGE_READY:
          configureShell();
          break;
        case MESSAGE_CONTEXT:
          fireReadyEvent(content.getArray(FIELD_READY_RECIPES).asObjectArray());
          break;
        case MESSAGE_DATA:
          logger.warning("logger: Received deprecated 'data' message");
          break;
        case MESSAGE_PEC:
          deliverPecMessage(content.getObject(FIELD_DATA));
          break;
        case MESSAGE_OUTPUT:
          if (!uiBroker.render(content.getObject(FIELD_DATA))) {
            logger.warning(
                "Skipped rendering content for "
                    + jsonParser.stringify(content.getObject("data")));
          }
          break;
        default:
          throw new AssertionError("Received unsupported message: " + message);
      }
    });
  }

  private void deliverPecMessage(PortableJson message) {
    String pecId = message.getString(FIELD_PEC_ID);
    String sessionId =
      message.hasKey(FIELD_SESSION_ID) ? message.getString(FIELD_SESSION_ID) : null;
    pecPortManager.deliverPecMessage(pecId, sessionId, message);
  }

  private void fireReadyEvent(List<PortableJson> recipes) {
    readyListeners.forEach(listener -> listener.onReady(recipes));
  }

  private void configureShell() {
    PortableJson msg =
        jsonParser
            .emptyObject()
            .put(Constants.MESSAGE_FIELD, Constants.CONFIGURE_MESSAGE)
            .put("config", jsonParser.emptyObject()
                .put("rootPath", ".")
                .put("storage", "volatile://")
                .put("manifest", dynamicManifest)
                .put("urlMap", jsonParser.emptyObject()
                    .put("https://$build/", "")));
    sendMessageToArcs(jsonParser.stringify(msg));
  }
}
