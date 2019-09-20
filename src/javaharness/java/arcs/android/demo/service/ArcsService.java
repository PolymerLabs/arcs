package arcs.android.demo.service;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebSettings;
import arcs.android.api.IArcsService;
import arcs.android.api.IRemotePecCallback;
import arcs.api.HarnessController;
import arcs.api.PecPortManager;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.RemotePecPort;
import arcs.api.ShellApiBasedArcsEnvironment;
import javax.inject.Inject;

/**
 * ArcsService wraps Arcs runtime. Other Android activities/services are expected to connect to
 * ArcsService to communicate with Arcs.
 */
public class ArcsService extends Service {

  private static final String TAG = "Arcs";

  private WebView arcsWebView;

  @Inject HarnessController harnessController;
  @Inject ShellApiBasedArcsEnvironment shellEnvironment;
  @Inject PecPortManager pecPortManager;
  @Inject PortableJsonParser jsonParser;

  @Override
  public void onCreate() {
    super.onCreate();

    Log.d(TAG, "onCreate()");

    arcsWebView = new WebView(this);
    arcsWebView.setVisibility(View.GONE);
    arcsWebView.getSettings().setAppCacheEnabled(false);
    arcsWebView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
    arcsWebView.clearCache(true);

    DaggerArcsServiceComponent.builder()
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
      @Override
      public void sendMessageToArcs(String message) {
        shellEnvironment.sendMessageToArcs(message, /* listener= */ null);
      }

      @Override
      public void startArc(
          String arcId,
          String pecId,
          String recipe,
          String particleId,
          String particleName,
          IRemotePecCallback callback) {
      RemotePecPort remotePecPort =
            new RemotePecPort(
                message -> {
                  try {
                    callback.onMessage(message);
                  } catch (RemoteException e) {
                    throw new RuntimeException(e);
                  }
                },
                jsonParser);
        pecPortManager.addRemotePecPort(pecId, remotePecPort);
        // TODO: Use startArc method instead - should be factored out of DeviceClient.
        PortableJson request = jsonParser.emptyObject()
            .put("message", "runArc")
            .put("arcId", arcId)
            .put("pecId", pecId)
            .put("recipe", recipe);
        if (particleId != null) {
          request
              .put("particleId", particleId)
              .put("particleName", particleName);
        }
        shellEnvironment.sendMessageToArcs(jsonParser.stringify(request), null);
      }

      @Override
      public void stopArc(String arcId, String pecId) {
        // TODO: Stop the running arc once the Arcs Runtime supports that.

        pecPortManager.removePecPort(pecId);
      }
    };
  }
}
