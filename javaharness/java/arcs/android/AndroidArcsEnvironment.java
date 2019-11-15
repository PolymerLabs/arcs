package arcs.android;

import android.content.Context;
import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;
import android.os.Trace;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewAssetLoader.AssetsPathHandler;
import androidx.webkit.WebViewAssetLoader.ResourcesPathHandler;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

import javax.inject.Provider;
import javax.inject.Singleton;

import arcs.api.Constants;
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

  private static final String ASSETS_PREFIX = "https://$assets/";
  // Uses relative path to support multiple protocols i.e. file, https and etc.
  private static final String APK_ASSETS_URL_PREFIX = "./";
  private static final String ROOT_MANIFEST_FILENAME = "Root.arcs";

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

  void init(Context context) {
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

    // As trampolines to map https protocol to file protocol.
    // E.g. https://appassets.androidplatform.net/assets/foo is mapped to
    // file:///android_asset/foo
    final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", new AssetsPathHandler(context))
        .addPathHandler("/res/", new ResourcesPathHandler(context))
        .build();

    webView.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        // For the renderer main thread to intercept the urls.
        return assetLoader.shouldInterceptRequest(request.getUrl());
      }

      @Override
      public void onPageStarted(WebView view, String url, Bitmap favicon) {
        Trace.beginAsyncSection("AndroidArcsEnvironment::init::loadUrl", 0);
      }

      @Override
      public void onPageFinished(WebView view, String url) {
        Trace.endAsyncSection("AndroidArcsEnvironment::init::loadUrl", 0);
      }
    });

    ServiceWorkerController.getInstance()
        .setServiceWorkerClient(new ServiceWorkerClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
        // For the service worker thread to intercept the urls.
        return assetLoader.shouldInterceptRequest(request.getUrl());
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
    if (settings.enableArcsExplorer()) {
      url += "&explore-proxy=" + settings.devServerPort();
    }
    if (settings.useCacheManager()) {
      url += "&use-cache";
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
    RuntimeSettings settings = runtimeSettings.get();

    PortableJson urlMap = jsonParser.emptyObject()
        // For fetching bundled javascript.
        .put("https://$build/", "");

    if (settings.loadAssetsFromWorkstation()) {
      // Fetch generated root manifest from the APK assets directory.
      urlMap.put(
          ASSETS_PREFIX + ROOT_MANIFEST_FILENAME,
          APK_ASSETS_URL_PREFIX + ROOT_MANIFEST_FILENAME);
      // Fetch remaining assets from the workstation redirecting requests
      // for .wasm modules to the build directory.
      urlMap.put(ASSETS_PREFIX, jsonParser.emptyObject()
          .put("root", "http://localhost:" + settings.devServerPort() + "/")
          .put("buildDir", "bazel-bin/")
          .put("buildOutputRegex", "(\\\\.wasm)|(\\\\.root\\\\.arcs)$"));
    } else {
      // Fetch all assets from the APK assets directory.
      urlMap.put(ASSETS_PREFIX, APK_ASSETS_URL_PREFIX);
    }

    sendMessageToArcs(jsonParser.stringify(jsonParser
        .emptyObject()
        .put(Constants.MESSAGE_FIELD, Constants.CONFIGURE_MESSAGE)
        .put("config", jsonParser.emptyObject()
            .put("rootPath", ".")
            .put("storage", "volatile://")
            .put("manifest", "import '" + ASSETS_PREFIX + ROOT_MANIFEST_FILENAME + "'")
            .put("urlMap", urlMap))));
  }
}
