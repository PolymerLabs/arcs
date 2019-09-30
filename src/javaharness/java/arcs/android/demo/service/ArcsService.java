package arcs.android.demo.service;

import android.app.IntentService;
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
public class ArcsService extends IntentService {
  public static final String INTENT_REFERENCE_ID_FIELD = "intent_reference_id";

  private static final String TAG = "Arcs";

  private WebView arcsWebView;
  private boolean arcsReady;

  @Inject HarnessController harnessController;
  @Inject ShellApiBasedArcsEnvironment shellEnvironment;
  @Inject PecPortManager pecPortManager;
  @Inject PortableJsonParser jsonParser;
  @Inject UiBroker uiBroker;
  @Inject NotificationRenderer notificationRenderer;

  public ArcsService() {
    super(ArcsService.class.getSimpleName());
  }

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

    uiBroker.registerRenderer("notification", notificationRenderer);
  }

  @Override
  public void onDestroy() {
    Log.d(TAG, "onDestroy()");
    super.onDestroy();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    super.onStartCommand(intent, startId, startId);
    Log.d(TAG, "onStartCommand()");

    return START_STICKY;
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
                .put("recipe", recipe);
        if (pecId != null) {
          request.put("pecId", pecId);
        }
        if (providedSlotId != null) {
          request.put("providedSlotId", providedSlotId);
        }
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

  @Override
  public boolean onUnbind(Intent intent) {
    Log.d(TAG, "onUnbind()");
    return super.onUnbind(intent);
  }

  @Override
  protected void onHandleIntent(Intent intent) {
    String referenceId = intent.getStringExtra(INTENT_REFERENCE_ID_FIELD);
    Log.d(TAG, "Received referenceId " + referenceId);
    // TODO: pass this ID to Arcs as part an input event.
  }

  private void runWhenReady(Runnable runnable) {
    if (arcsReady) {
      runnable.run();
    } else {
      shellEnvironment.addReadyListener(recipes -> runnable.run());
    }
  }
}
