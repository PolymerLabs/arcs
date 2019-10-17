package arcs.android;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import arcs.api.ArcsEnvironment;
import arcs.api.ArcsMessageSender;
import arcs.api.HarnessController;
import arcs.api.PecPortManager;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.RuntimeSettings;
import arcs.api.UiBroker;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.inject.Provider;

public class AndroidHarnessController implements HarnessController {
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

  private static final Logger logger =
      Logger.getLogger(AndroidHarnessController.class.getName());

  private final List<ReadyListener> readyListeners = new ArrayList<>();

  private final WebView webView;
  // Fetches the up-to-date properties on every get().
  private final PortableJsonParser jsonParser;
  private final ArcsEnvironment environment;
  private final PecPortManager pecPortManager;
  private final UiBroker uiBroker;
  private final Provider<RuntimeSettings> runtimeSettings;

  @Inject
  AndroidHarnessController(
      PortableJsonParser jsonParser,
      ArcsEnvironment environment,
      PecPortManager pecPortManager,
      UiBroker uiBroker,
      ArcsMessageSender arcsMessageSender,
      WebView webView,
      Provider<RuntimeSettings> runtimeSettings) {
    this.jsonParser = jsonParser;
    this.environment = environment;
    this.pecPortManager = pecPortManager;
    this.uiBroker = uiBroker;
    this.webView = webView;
    this.runtimeSettings = runtimeSettings;
    arcsMessageSender.attachProxy(this::sendMessageToArcs);
  }

  @Override
  public void init() {
    if (webView != null) {
      setWebViewSettings();
      webView.addJavascriptInterface(this, "DeviceClient");
    }
  }

  @Override
  public void deInit() {
    if (webView != null) {
      // Clean up content/context thus the host devServer can be aware of the disconnection.
      webView.loadUrl("about:blank");
    }
  }

  @Override
  public void addReadyListener(ReadyListener listener) {
    readyListeners.add(listener);
  }

  private void setWebViewSettings() {
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
    WebView.setWebContentsDebuggingEnabled(true);
    webView.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return super.shouldInterceptRequest(view, request);
      }
    });

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

    logger.info("runtime url: " + url);
    webView.loadUrl(url);
  }

  private void sendMessageToArcs(String json) {
    String escapedEnvelope = json.replace("\\\"", "\\\\\"");

    String script = String.format("ShellApi.receive('%s');", escapedEnvelope);
    Log.e("Arcs", "Receive called " + script);

    if (webView != null) {
      new Handler(Looper.getMainLooper())
        .post(() -> webView.evaluateJavascript(script, (String unused) -> {}));
    } else {
      Log.e("Arcs", "webView is null");
    }
  }

  @JavascriptInterface
  public void receive(String json) {
    PortableJson content = jsonParser.parse(json);
    String message = content.getString(FIELD_MESSAGE);
    switch (message) {
      case MESSAGE_READY:
        logger.info("logger: Received 'ready' message");
        fireReadyEvent(content.getArray(FIELD_READY_RECIPES).asStringArray());
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
              + content.getObject("data").getString("containerSlotName"));
        }
        break;
      default:
        throw new AssertionError("Received unsupported message: " + message);
    }
  }

  private void deliverPecMessage(PortableJson message) {
    String pecId = message.getString(FIELD_PEC_ID);
    String sessionId =
      message.hasKey(FIELD_SESSION_ID) ? message.getString(FIELD_SESSION_ID) : null;
    pecPortManager.deliverPecMessage(pecId, sessionId, message);
  }

  private void fireReadyEvent(List<String> recipes) {
    readyListeners.forEach(listener -> listener.onReady(recipes));
  }
}
