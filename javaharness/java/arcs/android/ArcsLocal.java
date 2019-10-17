package arcs.android;

import arcs.api.PecInnerPort;
import javax.inject.Inject;

import arcs.api.ArcData;
import arcs.api.Arcs;
import arcs.api.ArcsEnvironment;
import arcs.api.PecPortManager;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.ShellApi;
import arcs.api.UiBroker;

// This class implements Arcs API for callers within the same Android service
// that hosts the Arcs Runtime.
public class ArcsLocal implements Arcs {

  private final PecPortManager pecPortManager;
  private final PortableJsonParser jsonParser;
  private final UiBroker uiBroker;
  private final ShellApi shellApi;

  @Inject
  ArcsLocal(
      PecPortManager pecPortManager,
      PortableJsonParser jsonParser,
      UiBroker uiBroker,
      ShellApi shellApi) {
    this.pecPortManager = pecPortManager;
    this.jsonParser = jsonParser;
    this.uiBroker = uiBroker;
    this.shellApi = shellApi;
  }

  @Override
  public void runArc(ArcData arcData) {
    PecInnerPort pecInnerPort = null;
    for (ArcData.ParticleData particleData : arcData.getParticleList()) {
      if (particleData.getParticle() != null) {
        if (pecInnerPort == null) {
          pecInnerPort =
              pecPortManager.getOrCreateInnerPort(arcData.getPecId(), arcData.getSessionId());
        }
        pecInnerPort.mapParticle(particleData.getParticle());
      }
    }
    shellApi.sendMessageToArcs(constructRunArcRequest(arcData));
  }

  @Override
  public void stopArc(ArcData arcData) {
    shellApi.sendMessageToArcs(constructStopArcRequest(arcData));
  }

  @Override
  public void sendMessageToArcs(String message) {
    shellApi.sendMessageToArcs(message);
  }

  @Override
  public UiBroker getUiBroker() {
    return uiBroker;
  }

  private String constructRunArcRequest(ArcData arcData) {
    PortableJson request =
        jsonParser
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
}
