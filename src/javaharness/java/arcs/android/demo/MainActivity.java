package arcs.android.demo;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import arcs.android.impl.AndroidHarnessController;
import arcs.android.impl.AndroidShellApiImpl;
/**
 * Main class for the Bazel Android "Hello, World" app.
 */
public class MainActivity extends Activity {

  private WebView arcsWebView;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    Log.v("Bazel", "Hello, Android");

    setContentView(R.layout.activity_main);

    arcsWebView = new WebView(this);

    arcsWebView.setVisibility(View.VISIBLE);
    setContentView(arcsWebView);
    setWebViewSettings();

    DemoComponent component = DaggerDemoComponent.builder().appContext(this).build();
    ((AndroidHarnessController) component.getHarnessController()).init(arcsWebView);
    ((AndroidShellApiImpl) component.getShellApi()).setWebKit(arcsWebView);
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
    arcsWebView.loadUrl("http://localhost:8786/shells/pipes-shell/web/deploy/dist/?log=2"); //?m=https://$particles/PipeApps/Ingestion.arcs&log=2");
  }

}
