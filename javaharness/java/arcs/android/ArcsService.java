package arcs.android;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;

import java.util.List;

import javax.inject.Inject;

import arcs.api.ArcData;
import arcs.api.Arcs;
import arcs.api.ArcsMessageSender;
import arcs.api.PecInnerPortProxy;
import arcs.api.PecPortManager;
import arcs.api.PortableJsonParser;
import arcs.api.UiBroker;

/**
 * ArcsService wraps Arcs runtime. Other Android activities/services are expected to connect to
 * ArcsService to communicate with Arcs.
 */
public class ArcsService extends IntentService {

  private static final String TAG = "Arcs";

  public static final String INTENT_REFERENCE_ID_FIELD = "intent_reference_id";
  public static final String INTENT_EVENT_DATA_FIELD = "intent_event_data";

  private static final String MESSAGE_FIELD = "message";
  private static final String UI_EVENT_MESSAGE = "uiEvent";
  private static final String PARTICLE_ID_FIELD = "particleId";
  private static final String EVENTLET_FIELD = "eventlet";

  private WebView arcsWebView;
  private boolean arcsReady;

  @Inject Arcs arcs;
  @Inject AndroidArcsEnvironment environment;
  @Inject ArcsMessageSender arcsMessageSender;
  @Inject PecPortManager pecPortManager;
  @Inject PortableJsonParser jsonParser;
  @Inject UiBroker uiBroker;

  @Override
  public void onCreate() {
    super.onCreate();

    Log.d(TAG, "onCreate()");

    DaggerArcsServiceComponent.builder()
        .appContext(getApplicationContext())
        .build()
        .inject(this);

    environment.init();
    environment.addReadyListener(recipes -> arcsReady = true);
  }

  @Override
  public void onDestroy() {
    Log.d(TAG, "onDestroy()");
    environment.destroy();
    super.onDestroy();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    Log.d(TAG, "onStartCommand()");
    super.onStartCommand(intent, flags, startId);
    return START_STICKY;
  }

  @Override
  public IBinder onBind(Intent intent) {
    Log.d(TAG, "onBind()");
    return new IArcsService.Stub() {
      @Override
      public void sendMessageToArcs(String message) {
        arcsMessageSender.sendMessageToArcs(message);
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
        PecInnerPortProxy pecInnerPortProxy =
            new PecInnerPortProxy(
                message -> {
                  try {
                    callback.onMessage(message);
                  } catch (RemoteException e) {
                    throw new RuntimeException(e);
                  }
                },
                jsonParser);
        pecPortManager.addPecInnerPortProxy(pecId, pecInnerPortProxy);

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
          PecPort pecPort = null;
          for (ArcData.ParticleData particleData : arcData.getParticleList()) {
            if (particleData.getParticle() != null) {
              if (pecPort == null) {
                pecPort = pecPortManager.getOrCreatePecPort(
                  arcData.getPecId(), arcData.getSessionId());
              }
              pecPort.mapParticle(particleData.getParticle());
            }
          }
          shellApi.sendMessageToArcs(constructRunArcRequest(arcData));
        });
      }

      @Override
      public void stopArc(String arcId, String pecId) {
        runWhenReady(() -> {
          ArcData arcData = new ArcData.Builder().setArcId(arcId).setPecId(pecId).build();
          shellApi.sendMessageToArcs(constructStopArcRequest(arcData));
        });
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
    shellApi.sendMessageToArcs(
        jsonParser.stringify(
            jsonParser
                .emptyObject()
                .put(MESSAGE_FIELD, UI_EVENT_MESSAGE)
                .put(PARTICLE_ID_FIELD, referenceId)
                .put(EVENTLET_FIELD, jsonParser.parse(eventlet))));
  }

  private String constructRunArcRequest(ArcData arcData) {
    PortableJson request = jsonParser
      .emptyObject()
      .put(Arcs.MESSAGE_FIELD, Arcs.RUN_ARC_MESSAGE)
      .put(Arcs.ARC_ID_FIELD, arcData.getArcId())
      .put(Arcs.PEC_ID_FIELD, arcData.getPecId())
      .put(Arcs.RECIPE_FIELD, arcData.getRecipe());
    PortableJson particles = jsonParser.emptyArray();
    arcData.getParticleList().forEach(particleData -> {
      if (particleData.getName() != null && particleData.getId() != null) {
        PortableJson particleJson =
          jsonParser
            .emptyObject()
            .put(Arcs.PARTICLE_ID_FIELD, particleData.getId())
            .put(Arcs.PARTICLE_NAME_FIELD, particleData.getName());
        if (particleData.getProvidedSlotId() != null) {
          particleJson.put(Arcs.PROVIDED_SLOT_ID_FIELD, particleData.getProvidedSlotId());
        }
        particles.put(0, particleJson);
      }
    });

    if (particles.getLength() > 0) {
      request.put(Arcs.PARTICLES_FIELD, particles);
    }
    return jsonParser.stringify(request);
  }

  private String constructStopArcRequest(ArcData arcData) {
    return jsonParser.stringify(
      jsonParser
        .emptyObject()
        .put(Arcs.MESSAGE_FIELD, Arcs.STOP_ARC_MESSAGE)
        .put(Arcs.ARC_ID_FIELD, arcData.getArcId())
        .put(Arcs.PEC_ID_FIELD, arcData.getPecId()));
  }

  private void runWhenReady(Runnable runnable) {
    if (arcsReady) {
      runnable.run();
    } else {
      environment.addReadyListener(recipes -> runnable.run());
    }
  }
}
