package arcs.android.service;

import android.app.IntentService;
import android.content.Intent;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import java.util.List;
import javax.inject.Inject;

import arcs.android.api.IArcsService;
import arcs.android.api.IRemoteOutputCallback;
import arcs.android.api.IRemotePecCallback;
import arcs.api.ArcData;
import arcs.api.Arcs;
import arcs.api.HarnessController;
import arcs.api.PecPortManager;
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
  public static final String INTENT_EVENT_DATA_FIELD = "intent_event_data";

  private static final String MESSAGE_FIELD = "message";
  private static final String STOP_ARC_MESSAGE = "stopArc";
  private static final String ARC_ID_FIELD = "arcId";
  private static final String PEC_ID_FIELD = "pecId";
  private static final String UI_EVENT_MESSAGE = "uiEvent";
  private static final String PARTICLE_ID_FIELD = "particleId";
  private static final String EVENTLET_FIELD = "eventlet";
  private static final String TAG = "Arcs";

  private WebView arcsWebView;
  private boolean arcsReady;

  @Inject Arcs arcs;
  @Inject HarnessController harnessController;
  @Inject ShellApiBasedArcsEnvironment shellEnvironment;
  @Inject PecPortManager pecPortManager;
  @Inject PortableJsonParser jsonParser;
  @Inject UiBroker uiBroker;

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
  }

  @Override
  public void onDestroy() {
    Log.d(TAG, "onDestroy()");
    super.onDestroy();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    super.onStartCommand(intent, flags, startId);
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
          List<String> particleIds,
          List<String> particleNames,
          List<String> providedSlotIds,
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

        runWhenReady(() -> {
            ArcData.Builder arcDataBuilder = new ArcData.Builder()
              .setArcId(arcId)
              .setPecId(pecId)
              .setRecipe(recipe);
            for (int i = 0; i < particleIds.size(); ++i) {
              arcDataBuilder.addParticleData(
                  new ArcData.ParticleData()
                      .setId(particleIds.get(i))
                      .setName(particleNames.get(i))
                      .setProvidedSlotId(providedSlotIds.get(i)));
            }

            arcs.runArc(arcDataBuilder.build());
        });
      }

      @Override
      public void stopArc(String arcId, String pecId) {
        runWhenReady(
            () ->
                shellEnvironment.sendMessageToArcs(
                    jsonParser.stringify(
                        jsonParser
                            .emptyObject()
                            .put(MESSAGE_FIELD, STOP_ARC_MESSAGE)
                            .put(ARC_ID_FIELD, arcId))));
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
    // TODO(mmandlis): refactor into an Arcs API method.
    String referenceId = intent.getStringExtra(INTENT_REFERENCE_ID_FIELD);
    String eventlet = intent.getStringExtra(INTENT_EVENT_DATA_FIELD);
    Log.d(TAG, "Received referenceId " + referenceId);
    shellEnvironment.sendMessageToArcs(
        jsonParser.stringify(
            jsonParser
                .emptyObject()
                .put(MESSAGE_FIELD, UI_EVENT_MESSAGE)
                .put(PARTICLE_ID_FIELD, referenceId)
                .put(EVENTLET_FIELD, jsonParser.parse(eventlet))));
  }

  private void runWhenReady(Runnable runnable) {
    if (arcsReady) {
      runnable.run();
    } else {
      shellEnvironment.addReadyListener(recipes -> runnable.run());
    }
  }
}
