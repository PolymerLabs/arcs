package arcs.android;

import javax.inject.Inject;

import arcs.api.ArcData;
import arcs.api.Arcs;
import arcs.api.PecPort;
import arcs.api.PecPortManager;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.ShellApi;
import arcs.api.UiRenderer;

// This class implements Arcs API for callers running in Android service
// different that the one hosting the Arcs Runtime.
public class ArcsAndroid implements Arcs {

  private final ArcsServiceBridge bridge;
  private final PecPortManager pecPortManager;
  private final PortableJsonParser jsonParser;
  private final ShellApi shellApi;

  @Inject
  ArcsAndroid(
      ArcsServiceBridge bridge,
      PecPortManager pecPortManager,
      PortableJsonParser jsonParser,
      ShellApi shellApi) {
    this.bridge = bridge;
    this.pecPortManager = pecPortManager;
    this.jsonParser = jsonParser;
    this.shellApi = shellApi;

    this.shellApi.attachProxy(this::sendMessageToArcs);
  }

  @Override
  public void runArc(ArcData arcData) {
    PecPort pecPort =
        pecPortManager.getOrCreatePecPort(arcData.getPecId(), arcData.getSessionId());
    arcData.getParticleList().forEach(particleData -> {
      if (particleData.getParticle() != null) {
        pecPort.mapParticle(particleData.getParticle());
      }
    });

    bridge.startArc(arcData, createPecCallback(pecPort));
  }

  @Override
  public void stopArc(ArcData arcData) {
    bridge.stopArc(arcData.getArcId(), arcData.getPecId());
  }

  @Override
  public void registerRenderer(String modality, UiRenderer renderer) {
    bridge.registerRenderer(modality,
      new IRemoteOutputCallback.Stub() {
        @Override
        public void onOutput(String output) {
          PortableJson json = jsonParser.parse(output);
          renderer.render(json);
        }
      });
  }

  private void sendMessageToArcs(String msg) {
    bridge.sendMessageToArcs(msg);
  }

  private IRemotePecCallback createPecCallback(PecPort pecPort) {
    return new IRemotePecCallback.Stub() {
      @Override
      public void onMessage(String message) {
        pecPort.onReceivePecMessage(jsonParser.parse(message));
      }
    };
  }
}
