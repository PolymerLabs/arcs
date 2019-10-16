package arcs.android;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClient;
import arcs.api.HarnessController;
import arcs.api.RuntimeSettings;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.inject.Provider;

public class AndroidHarnessController implements HarnessController {
  private static final Logger logger =
      Logger.getLogger(AndroidHarnessController.class.getName());

  private ArcsEnvironment environment;
  private DeviceClient deviceClient;
  private WebView webView;
  // Fetches the up-to-date properties on every get().
  private Provider<RuntimeSettings> runtimeSettings;

  @Inject
  AndroidHarnessController(
      ArcsEnvironment environment,
      DeviceClient deviceClient,
      WebView webView,
      Provider<RuntimeSettings> runtimeSettings) {
    this.environment = environment;
    this.deviceClient = deviceClient;
    this.webView = webView;
    this.runtimeSettings = runtimeSettings;
  }

  @Override
  public void init() {
    if (webView != null) {
      setWebViewSettings();
      webView.addJavascriptInterface(deviceClient, "DeviceClient");
    }
  }

  @Override
  public void deInit() {
    if (webView != null) {
      // Clean up content/context thus the host devServer can be aware of the disconnection.
      webView.loadUrl("about:blank");
    }
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
}
