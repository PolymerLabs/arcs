package arcs.android.demo.service;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import javax.inject.Inject;

import arcs.android.api.IArcsService;
import arcs.android.api.IRemoteOutputCallback;
import arcs.android.api.IRemotePecCallback;
import arcs.api.HarnessController;
import arcs.api.PecPortManager;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.RemotePecPort;
import arcs.api.ShellApiBasedArcsEnvironment;
import arcs.api.UiBroker;

/**
 * ArcsService wraps Arcs runtime. Other Android activities/services are expected to connect to
 * ArcsService to communicate with Arcs.
 */
public class ArcsService extends Service {

  private static final String TAG = "Arcs";

  private WebView arcsWebView;
  private boolean arcsReady;

  @Inject HarnessController harnessController;
  @Inject ShellApiBasedArcsEnvironment shellEnvironment;
  @Inject PecPortManager pecPortManager;
  @Inject PortableJsonParser jsonParser;
  @Inject UiBroker uiBroker;

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

    shellEnvironment.addReadyListener(recipes -> arcsReady = true);

    harnessController.init();
  }

  @Override
  public IBinder onBind(Intent intent) {
    Log.d(TAG, "onBind()");
    return new IArcsService.Stub() {
      @Override
      public void sendMessageToArcs(String message) {
        shellEnvironment.sendMessageToArcs(message);
      }

      @Override
      public void startArc(
          String arcId,
          String pecId,
          String recipe,
          String particleId,
          String particleName,
          String providedSlotId,
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
        PortableJson request =
            jsonParser
                .emptyObject()
                .put("message", "runArc")
                .put("arcId", arcId)
                .put("pecId", pecId)
                .put("providedSlotId", providedSlotId)
                .put("recipe", recipe);
        if (particleId != null) {
          request.put("particleId", particleId).put("particleName", particleName);
        }
        runWhenReady(() -> shellEnvironment.sendMessageToArcs(jsonParser.stringify(request)));
      }

      @Override
      public void stopArc(String arcId, String pecId) {
        runWhenReady(
            () ->
                shellEnvironment.sendMessageToArcs(
                    jsonParser.stringify(
                        jsonParser.emptyObject().put("message", "stopArc").put("arcId", arcId))));
        pecPortManager.removePecPort(pecId);
      }

      @Override
      public void registerRenderer(String modality, IRemoteOutputCallback callback) {
        uiBroker.registerRenderer(
            modality,
            content -> {
              try {
                callback.onOutput(jsonParser.stringify(content));
              } catch (RemoteException e) {
                throw new RuntimeException(e);
              }
              return true;
            });
      }
    };
  }

  private void runWhenReady(Runnable runnable) {
    if (arcsReady) {
      runnable.run();
    } else {
      shellEnvironment.addReadyListener(recipes -> runnable.run());
    }
  }
}
