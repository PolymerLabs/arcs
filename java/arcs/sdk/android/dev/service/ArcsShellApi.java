package arcs.sdk.android.dev.service;

import android.content.Context;
import android.os.RemoteException;

import java.util.HashMap;
import java.util.Map;

import javax.inject.Inject;
import javax.inject.Provider;
import javax.inject.Singleton;

import arcs.sdk.android.dev.api.ArcData;
import arcs.sdk.android.dev.api.Constants;
import arcs.sdk.android.dev.api.HandleFactory;
import arcs.sdk.android.dev.api.PecInnerPort;
import arcs.sdk.android.dev.api.PecInnerPortProxy;
import arcs.sdk.android.dev.api.PecPortManager;
import arcs.sdk.android.dev.api.PortableJson;
import arcs.sdk.android.dev.api.PortableJsonParser;
import arcs.sdk.android.dev.api.RuntimeSettings;
import arcs.sdk.android.dev.api.UiBroker;

@Singleton
class ArcsShellApi {

  private final PortableJsonParser jsonParser;
  private final AndroidArcsEnvironment environment;
  private final PecPortManager pecPortManager;
  private final UiBroker uiBroker;

  private boolean arcsReady;

  @Inject
  ArcsShellApi(PortableJsonParser portableJsonParser, HandleFactory handleFactory,
      Provider<RuntimeSettings> runtimeSettings) {
    this.jsonParser = portableJsonParser;
    this.pecPortManager = new PecPortManager(this::sendMessageToArcs, jsonParser, handleFactory);
    this.uiBroker = new UiBroker();
    this.environment = new AndroidArcsEnvironment(
        portableJsonParser, pecPortManager, uiBroker, runtimeSettings);
  }

  void init(Context context) {
    arcsReady = false;
    environment.init(context);
    environment.addReadyListener(recipes -> arcsReady = true);
    environment.addReadyListener(recipes -> {
      recipes.forEach(recipe -> {
        ArcData arcData = findStartupTrigger(recipe);
        if (arcData != null) {
          startArc(arcData);
        }
      });
    });
  }

  void destroy() {
    environment.destroy();
  }

  void startArc(ArcData arcData, IRemotePecCallback callback) {
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
    pecPortManager.addPecInnerPortProxy(arcData.getPecId(), pecInnerPortProxy);
    startArc(arcData);
  }

  void startArc(ArcData arcData) {
    runWhenReady(() -> {
      PecInnerPort pecInnerPort = null;
      for (ArcData.ParticleData particleData : arcData.getParticleList()) {
        if (particleData.getParticle() != null) {
          if (pecInnerPort == null) {
            pecInnerPort = pecPortManager.getOrCreatePecInnerPort(
                arcData.getPecId(), arcData.getSessionId());
          }
          pecInnerPort.mapParticle(particleData.getParticle());
        }
      }

      sendMessageToArcs(constructRunArcRequest(arcData));
    });
  }

  void stopArc(ArcData arcData) {
    runWhenReady(() -> sendMessageToArcs(
        constructStopArcRequest(arcData)));
    pecPortManager.removePecPort(arcData.getPecId());
  }

  void registerRemoteRenderer(String modality, IRemoteOutputCallback callback) {
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

  void sendMessageToArcs(String message) {
    runWhenReady(() -> environment.sendMessageToArcs(message));
  }

  private String constructRunArcRequest(ArcData arcData) {
    PortableJson request = jsonParser
        .emptyObject()
        .put(Constants.MESSAGE_FIELD, Constants.RUN_ARC_MESSAGE)
        .put(Constants.ARC_ID_FIELD, arcData.getArcId())
        .put(Constants.PEC_ID_FIELD, arcData.getPecId())
        .put(Constants.RECIPE_FIELD, arcData.getRecipe());
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

  private String constructStopArcRequest(ArcData arcData) {
    return jsonParser.stringify(
        jsonParser
            .emptyObject()
            .put(Constants.MESSAGE_FIELD, Constants.STOP_ARC_MESSAGE)
            .put(Constants.ARC_ID_FIELD, arcData.getArcId())
            .put(Constants.PEC_ID_FIELD, arcData.getPecId()));
  }

  private void runWhenReady(Runnable runnable) {
    if (arcsReady) {
      runnable.run();
    } else {
      environment.addReadyListener(recipes -> runnable.run());
    }
  }

  private ArcData findStartupTrigger(PortableJson recipe) {
    // Consider creating a helper class for recipe.
    PortableJson triggers = recipe.getArray("triggers");
    for (int j = 0; j < triggers.getLength(); ++j) {
      Map<String, String> triggersMap = new HashMap<>();
      for (int k = 0; k < triggers.getArray(j).getLength(); ++k) {
        triggersMap.put(triggers.getArray(j).getArray(k).getString(0), triggers.getArray(j).getArray(k).getString(1));
      }
      if ("startup".equals(triggersMap.get("launch"))) {
        String recipeName = recipe.getString("name");
        ArcData.Builder arcDataBuilder = new ArcData.Builder().setRecipe(recipeName);
        if (triggersMap.containsKey("arcId")) {
          arcDataBuilder.setArcId(triggersMap.get("arcId"));
        }
        return arcDataBuilder.build();
      }
    }
    return null;
  }
}
