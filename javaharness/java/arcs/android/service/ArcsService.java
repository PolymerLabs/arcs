package arcs.android.service;

import static arcs.api.Constants.RECIPE_FIELD;
import static arcs.api.Constants.RUN_ARC_MESSAGE;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;

import arcs.android.impl.AndroidArcsEnvironment;
import arcs.api.Constants;
import arcs.api.PortableJson;
import arcs.api.ShellApi;
import java.util.List;
import javax.inject.Inject;

import arcs.android.api.IArcsService;
import arcs.android.api.IRemoteOutputCallback;
import arcs.android.api.IRemotePecCallback;
import arcs.api.ArcData;
import arcs.api.PecPortManager;
import arcs.api.PortableJsonParser;
import arcs.api.RemotePecPort;
import arcs.api.UiBroker;

/**
 * ArcsService wraps Constants runtime. Other Android activities/services are expected to connect to
 * ArcsService to communicate with Constants.
 */
public class ArcsService extends Service {

  private static final String MESSAGE_FIELD = "message";
  private static final String STOP_ARC_MESSAGE = "stopArc";
  private static final String ARC_ID_FIELD = "arcId";
  private static final String PEC_ID_FIELD = "pecId";
  private static final String TAG = "Constants";

  private WebView arcsWebView;
  private boolean arcsReady;

  @Inject
  AndroidArcsEnvironment environment;
  @Inject
  ShellApi shellApi;
  @Inject
  PecPortManager pecPortManager;
  @Inject
  PortableJsonParser jsonParser;
  @Inject
  UiBroker uiBroker;

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

    environment.addReadyListener(recipes -> arcsReady = true);

    environment.init(this);
  }

  @Override
  public void onDestroy() {
    Log.d(TAG, "onDestroy()");
    environment.destroy();
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent intent) {
    Log.d(TAG, "onBind()");
    return new IArcsService.Stub() {
      @Override
      public void sendMessageToArcs(String message) {
        shellApi.sendMessageToArcs(message);
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

            ArcData arcData = arcDataBuilder.build();
          shellApi.sendMessageToArcs(constructRunArcRequest(arcData));
        });
      }

      @Override
      public void stopArc(String arcId, String pecId) {
        runWhenReady(
            () ->
                shellApi.sendMessageToArcs(
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
      environment.addReadyListener(recipes -> runnable.run());
    }
  }

  private String constructRunArcRequest(ArcData arcData) {

    PortableJson request = jsonParser
        .emptyObject()
        .put(MESSAGE_FIELD, RUN_ARC_MESSAGE)
        .put(ARC_ID_FIELD, arcData.getArcId())
        .put(PEC_ID_FIELD, arcData.getPecId())
        .put(RECIPE_FIELD, arcData.getRecipe());
    PortableJson particles = jsonParser.emptyArray();
    arcData.getParticleList().forEach(particleData -> {
      if (particleData.getName() != null && particleData.getId() != null) {
        PortableJson particleJson =
            jsonParser
                .emptyObject()
                .put(Constants.PARTICLE_ID_FIELD, particleData.getId())
                .put(Constants.PARTICLE_NAME_FIELD, particleData.getName());
        if (particleData.getProvidedSlotId() != null) {
          particleJson.put(Constants.PROVIDED_SLOT_ID_FIELD, particleData.getProvidedSlotId());
        }
        particles.put(0, particleJson);
      }
    });

    if (particles.getLength() > 0) {
      request.put(Constants.PARTICLES_FIELD, particles);
    }
    return jsonParser.stringify(request);
  }
}
