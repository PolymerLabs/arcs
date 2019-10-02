package arcs.android.impl;

import javax.inject.Inject;

import arcs.api.ArcData;
import arcs.api.Arcs;
import arcs.api.ArcsEnvironment;
import arcs.api.PECInnerPort;
import arcs.api.PecPortManager;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.UiBroker;

// This class implements Arcs API for callers within the same Android service
// that hosts the Arcs Runtime.
public class ArcsLocal implements Arcs {

  private final ArcsEnvironment environment;
  private final PecPortManager pecPortManager;
  private final PortableJsonParser jsonParser;
  private final UiBroker uiBroker;

  @Inject
  ArcsLocal(
      ArcsEnvironment environment,
      PecPortManager pecPortManager,
      PortableJsonParser jsonParser,
      UiBroker uiBroker) {
    this.environment = environment;
    this.pecPortManager = pecPortManager;
    this.jsonParser = jsonParser;
    this.uiBroker = uiBroker;
  }

  @Override
  public void runArc(ArcData arcData) {
    if (arcData.getParticle() != null) {
      PECInnerPort pecInnerPort =
          pecPortManager.getOrCreateInnerPort(arcData.getPecId(), arcData.getSessionId());
      pecInnerPort.mapParticle(arcData.getParticle());
    }
    environment.sendMessageToArcs(constructRunArcRequest(arcData));
  }

  @Override
  public void stopArc(ArcData arcData) {
    environment.sendMessageToArcs(constructStopArcRequest(arcData));
  }

  @Override
  public UiBroker getUiBroker() {
    return uiBroker;
  }

  private String constructRunArcRequest(ArcData arcData) {
    PortableJson request =
        jsonParser
            .emptyObject()
            .put("message", "runArc")
            .put("arcId", arcData.getArcId())
            .put("pecId", arcData.getPecId())
            .put("recipe", arcData.getRecipe());

    if (arcData.getParticleName() != null && arcData.getParticleId() != null) {
      request
          .put("particleId", arcData.getParticleId())
          .put("particleName", arcData.getParticleName());
      if (arcData.getProvidedSlotId() != null) {
        request.put("providedSlotId", arcData.getProvidedSlotId());
      }
    }
    return jsonParser.stringify(request);
  }

  private String constructStopArcRequest(ArcData arcData) {
    return jsonParser.stringify(
        jsonParser
            .emptyObject()
            .put("message", "stopArc")
            .put("arcId", arcData.getArcId())
            .put("pecId", arcData.getPecId()));
  }
}
