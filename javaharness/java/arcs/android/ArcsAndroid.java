package arcs.android;

import javax.inject.Inject;

import arcs.api.ArcData;
import arcs.api.Arcs;
import arcs.api.ArcsMessageSender;
import arcs.api.PecInnerPort;
import arcs.api.PecPortManager;
import arcs.api.PortableJsonParser;
import arcs.api.UiBroker;

// This class implements Arcs API for callers running in Android service
// different that the one hosting the Arcs Runtime.
public class ArcsAndroid implements Arcs {

  private final ArcsServiceBridge bridge;
  private final PecPortManager pecPortManager;
  private final PortableJsonParser jsonParser;
  private final UiBroker uiBroker;
  private final ArcsMessageSender arcsMessageSender;

  @Inject
  ArcsAndroid(
      ArcsServiceBridge bridge,
      PecPortManager pecPortManager,
      PortableJsonParser jsonParser,
      UiBroker uiBroker,
      ArcsMessageSender arcsMessageSender) {
    this.bridge = bridge;
    this.pecPortManager = pecPortManager;
    this.jsonParser = jsonParser;
    this.uiBroker = uiBroker;
    this.arcsMessageSender = arcsMessageSender;
  }

  @Override
  public void runArc(ArcData arcData) {
    PecInnerPort pecInnerPort =
        pecPortManager.getOrCreatePecInnerPort(arcData.getPecId(), arcData.getSessionId());
    arcData.getParticleList().forEach(particleData -> {
      if (particleData.getParticle() != null) {
        pecInnerPort.mapParticle(particleData.getParticle());
      }
    });

    bridge.startArc(arcData, createPecCallback(pecInnerPort));
  }

  @Override
  public void stopArc(ArcData arcData) {
    bridge.stopArc(arcData.getArcId(), arcData.getPecId());
  }

  @Override
  public void sendMessageToArcs(String message) {
    arcsMessageSender.sendMessageToArcs(message);
  }

  @Override
  public UiBroker getUiBroker() {
    return uiBroker;
  }

  private IRemotePecCallback createPecCallback(PecInnerPort pecInnerPort) {
    return new IRemotePecCallback.Stub() {
      @Override
      public void onMessage(String message) {
        pecInnerPort.onReceivePecMessage(jsonParser.parse(message));
      }
    };
  }
}
