package arcs.android.demo.service;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;
import android.view.View;
import android.webkit.WebView;
import arcs.android.demo.api.IArcsService;
import arcs.api.HarnessController;
import javax.inject.Inject;

/**
 * ArcsService wraps Arcs runtime. Other Android activities/services are expected to connect to
 * ArcsService to communicate with Arcs.
 */
public class ArcsService extends Service {

  private static final String TAG = "Arcs";

  private WebView arcsWebView;

  @Inject
  HarnessController harnessController;

  @Override
  public void onCreate() {
    super.onCreate();

    Log.d(TAG, "onCreate()");

    arcsWebView = new WebView(this);
    arcsWebView.setVisibility(View.GONE);

    DaggerArcsServiceComponent
        .builder()
        .appContext(getApplicationContext())
        .webView(arcsWebView)
        .build()
        .inject(this);

    harnessController.init();
  }

  @Override
  public IBinder onBind(Intent intent) {
    Log.d(TAG, "onBind()");
    return new IArcsService.Stub() {
    };
  }
}
