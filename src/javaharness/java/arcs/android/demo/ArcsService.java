package arcs.android.demo;

import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * ArcsService wraps Arcs runtime. Other Android activities/services are expected to connect to
 * ArcsService to communicate with Arcs.
 */
public class ArcsService extends Service {

  private static final String TAG = "Arcs";

  private static final String ARCS_API_NAME = "DeviceClient";
  private WebView arcsWebView;

  @Override
  public void onCreate() {
    super.onCreate();

    Log.d(TAG, "onCreate()");

    arcsWebView = new WebView(this);
    arcsWebView.addJavascriptInterface(this, ARCS_API_NAME);
    arcsWebView.setVisibility(View.GONE);
    setWebViewSettings();
  }

  private void setWebViewSettings() {
    WebSettings arcsSettings = this.arcsWebView.getSettings();
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
    arcsWebView.setWebViewClient(new WebViewClient() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return super.shouldInterceptRequest(view, request);
      }
    });
    arcsWebView.loadUrl("file:///android_asset/index.html");
  }

  @Override
  public IBinder onBind(Intent intent) {
    Log.d(TAG, "onBind()");
    return new IArcsService.Stub() {
    };
  }

  /**
   * This method will be called from Arcs runtime in the WebView.
   */
  @JavascriptInterface
  public void receive(String data) {
    Log.d(TAG, "Got data: " + data);
  }

  /**
   * Call a Javascript on the WebView.
   */
  private void executeJavascript(String script) {
    new Handler(Looper.getMainLooper()).post(
      () -> arcsWebView.evaluateJavascript(
        script,
        result -> Log.d(TAG, "Got result: " + result)
      )
    );
  }
}
