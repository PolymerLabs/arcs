package arcs.android.impl;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClient;
import arcs.api.HarnessController;
import arcs.api.UiBroker;
import javax.inject.Inject;

public class AndroidHarnessController implements HarnessController {

  private final ArcsEnvironment environment;
  private final DeviceClient deviceClient;
  private final WebView webView;
  private final UiBroker uiBroker;

  @Inject
  AndroidHarnessController(
      ArcsEnvironment environment,
      DeviceClient deviceClient,
      WebView webView,
      UiBroker uiBroker) {
    this.environment = environment;
    this.deviceClient = deviceClient;
    this.webView = webView;
    this.uiBroker = uiBroker;
  }

  @Override
  public void init() {
    if (webView != null) {
      setWebViewSettings();
      webView.addJavascriptInterface(deviceClient, "DeviceClient");
    }
  }

  @Override
  public UiBroker getUiBroker() {
    return uiBroker;
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
