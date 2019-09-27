package arcs.android.client;

import javax.inject.Inject;

import arcs.android.api.IRemotePecCallback;
import arcs.api.Arc;
import arcs.api.ArcsImpl;
import arcs.api.PECInnerPort;
import arcs.api.PECInnerPortFactory;

public class AndroidArcsImpl extends ArcsImpl {

  @Inject protected ArcsServiceBridge bridge;
  @Inject protected PECInnerPortFactory pecInnerPortFactory;

  @Inject
  AndroidArcsImpl() {}

  @Override
  public void runArc(Arc arc) {
    PECInnerPort pecInnerPort =
        pecInnerPortFactory.createPECInnerPort(arc.getPecId(), arc.getSessionId());
    if (arc.getParticle() != null) {
      pecInnerPort.mapParticle(arc.getParticle());
    }

    bridge.startArc(arc, createPecCallback(pecInnerPort));
  }

  @Override
  public void stopArc(String arcId, String pecId) {
    bridge.stopArc(arcId, pecId);
  }

  private IRemotePecCallback createPecCallback(PECInnerPort pecInnerPort) {
    return new IRemotePecCallback.Stub() {
      @Override
      public void onMessage(String message) {
        pecInnerPort.onReceivePecMessage(jsonParser.parse(message));
      }
    };
  }
}
