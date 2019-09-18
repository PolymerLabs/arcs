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
      public void registerRemotePec(String pecId, IRemotePecCallback callback) {
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
        // TODO: This method should be called startArc and receive more parameters.
        // TODO: Use startArc method instead, should be factored out of DeviceClient.
        shellEnvironment.sendMessageToArcs(jsonParser.stringify(jsonParser.emptyObject()
            .put("message", "runArc")
            .put("arcId", "arc-" + pecId)
            .put("pecId", pecId)
            .put("recipe", "AndroidAutofill")
            .put("particleId", "autofill-particle-id")
            .put("particleName", "AutofillParticle")
            ), null);
      }

      @Override
      public void deregisterRemotePec(String pecId) {
        // TODO(csilvestrini): Remove from PecPortManager.
      }
    };
  }
}
