package arcs.android.client;

import arcs.api.Particle;
import arcs.api.ShellApi;
import arcs.api.UiRenderer;
import javax.inject.Inject;

import arcs.android.api.IRemotePecCallback;
import arcs.api.ArcData;
import arcs.api.PECInnerPort;
import arcs.api.PecPortManager;
import arcs.api.PortableJsonParser;
import arcs.api.UiBroker;

// This class implements Constants API for callers running in Android service
// different that the one hosting the Constants Runtime.
public class AndroidArcsClient {

  private final ArcsServiceBridge bridge;
  private final PecPortManager pecPortManager;
  private final PortableJsonParser jsonParser;
  private final UiBroker uiBroker;
  private final ShellApi shellApi;

  @Inject
  AndroidArcsClient(
      ArcsServiceBridge bridge,
      PecPortManager pecPortManager,
      PortableJsonParser jsonParser,
      UiBroker uiBroker,
      ShellApi shellApi) {
    this.bridge = bridge;
    this.pecPortManager = pecPortManager;
    this.jsonParser = jsonParser;
    this.uiBroker = uiBroker;
    this.shellApi = shellApi;

    shellApi.attachProxy(this::sendMessageToArcs);
  }

  public ArcData runArc(String recipe) {
    ArcData arcData = new ArcData.Builder().setRecipe(recipe).build();
    runArc(arcData);
    return arcData;
  }

  public ArcData runArc(String recipe, Particle particle) {
    ArcData arcData =
        new ArcData.Builder()
            .setRecipe(recipe)
            .addParticleData(new ArcData.ParticleData().setParticle(particle))
            .build();
    runArc(arcData);
    return arcData;
  }

  public ArcData runArc(String recipe, String arcId, String pecId) {
    ArcData arcData =
        new ArcData.Builder().setRecipe(recipe).setArcId(arcId).setPecId(pecId).build();
    runArc(arcData);
    return arcData;
  }

  public ArcData runArc(String recipe, String arcId, String pecId, Particle particle) {
    ArcData arcData =
        new ArcData.Builder()
            .setRecipe(recipe)
            .setArcId(arcId)
            .setPecId(pecId)
            .addParticleData(new ArcData.ParticleData().setParticle(particle))
            .build();
    runArc(arcData);
    return arcData;
  }


  public void runArc(ArcData arcData) {
    PECInnerPort pecInnerPort =
        pecPortManager.getOrCreateInnerPort(arcData.getPecId(), arcData.getSessionId());
    arcData.getParticleList().forEach(particleData -> {
      if (particleData.getParticle() != null) {
        pecInnerPort.mapParticle(particleData.getParticle());
      }
    });

    bridge.startArc(arcData, createPecCallback(pecInnerPort));
  }

  public void stopArc(ArcData arcData) {
    bridge.stopArc(arcData.getArcId(), arcData.getPecId());
  }

  public void sendMessageToArcs(String message) {
    bridge.sendMessageToArcs(message);
  }

  public UiBroker getUiBroker() {
    return uiBroker;
  }

  public void registerRenderer(String modality, UiRenderer renderer) {
    getUiBroker().registerRenderer(modality, renderer);
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
