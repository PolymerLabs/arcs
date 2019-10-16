package arcs.android;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import arcs.api.RemotePecPort;
import java.util.List;
import javax.inject.Inject;

import arcs.android.IArcsService;
import arcs.android.IRemoteOutputCallback;
import arcs.android.IRemotePecCallback;
import arcs.api.ArcData;
import arcs.api.Arcs;
import arcs.api.HarnessController;
import arcs.api.PecPortManager;
import arcs.api.PortableJsonParser;
import arcs.api.ShellApiBasedArcsEnvironment;
import arcs.api.UiBroker;

/**
 * ArcsService wraps Arcs runtime. Other Android activities/services are expected to connect to
 * ArcsService to communicate with Arcs.
 */
public class ArcsService extends Service {

  private static final String MESSAGE_FIELD = "message";
  private static final String STOP_ARC_MESSAGE = "stopArc";
  private static final String ARC_ID_FIELD = "arcId";
  private static final String PEC_ID_FIELD = "pecId";
  private static final String TAG = "Arcs";

  private WebView arcsWebView;
  private boolean arcsReady;

  @Inject Arcs arcs;
  @Inject HarnessController harnessController;
  @Inject ShellApiBasedArcsEnvironment shellEnvironment;
  @Inject
  PecPortManager pecPortManager;
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
  public void onDestroy() {
    Log.d(TAG, "onDestroy()");
    harnessController.deInit();
    super.onDestroy();
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

  private void runWhenReady(Runnable runnable) {
    if (arcsReady) {
      runnable.run();
    } else {
      shellEnvironment.addReadyListener(recipes -> runnable.run());
    }
  }
}
