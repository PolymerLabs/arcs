package arcs.android.impl;

import javax.inject.Inject;

import arcs.api.Arc;
import arcs.api.ArcsEnvironment;
import arcs.api.ArcsImpl;
import arcs.api.PECInnerPort;
import arcs.api.PecPortManager;
import arcs.api.PortableJson;

public class LocalArcsImpl extends ArcsImpl {

  @Inject protected ArcsEnvironment environment;
  @Inject protected PecPortManager pecPortManager;

  @Inject LocalArcsImpl() {}

  @Override
  public void runArc(Arc arc) {
    PortableJson request =
        jsonParser
            .emptyObject()
            .put("message", "runArc")
            .put("arcId", arc.getArcId())
            .put("pecId", arc.getPecId())
            .put("recipe", arc.getRecipe());

    if (arc.getParticleName() != null && arc.getParticleId() != null) {
      request.put("particleId", arc.getParticleId()).put("particleName", arc.getParticleName());
      if (arc.getProvidedSlotId() !=  null) {
        request.put("providedSlotId", arc.getProvidedSlotId());
      }
    }
    if (arc.getParticle() != null) {
      PECInnerPort pecInnerPort =
          pecPortManager.getOrCreateInnerPort(arc.getPecId(), arc.getSessionId());
      pecInnerPort.mapParticle(arc.getParticle());
    }
    environment.sendMessageToArcs(jsonParser.stringify(request));
  }

  @Override
  public void stopArc(String arcId, String pecId) {
    environment.sendMessageToArcs(
        jsonParser.stringify(
            jsonParser
                .emptyObject()
                .put("message", "stopArc")
                .put("arcId", arcId)
                .put("pecId", pecId)));
  }
}
