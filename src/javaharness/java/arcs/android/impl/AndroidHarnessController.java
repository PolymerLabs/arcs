package arcs.android.impl;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClient;
import arcs.api.HarnessController;
import javax.inject.Inject;

public class AndroidHarnessController implements HarnessController {

  private ArcsEnvironment environment;
  private DeviceClient deviceClient;
  private WebView webView;

  @Inject
  AndroidHarnessController(
      ArcsEnvironment environment,
      DeviceClient deviceClient,
      WebView webView) {
    this.environment = environment;
    this.deviceClient = deviceClient;
    this.webView = webView;
  }

  @Override
  public void init() {
    if (webView != null) {
      setWebViewSettings();
      webView.addJavascriptInterface(deviceClient, "DeviceClient");
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
    webView.loadUrl("file:///android_asset/index.html");
  }
}
