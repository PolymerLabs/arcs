package arcs.android.client;

import android.os.RemoteException;
import arcs.android.api.IRemotePecCallback;
import arcs.api.Particle;
import arcs.api.PECInnerPort;
import arcs.api.PECInnerPortFactory;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import javax.inject.Inject;

public class RemotePec {

  private final ArcsServiceBridge bridge;
  private final PECInnerPortFactory pecInnerPortFactory;
  private final PortableJsonParser jsonParser;

  private PECInnerPort pecInnerPort;

  private final IRemotePecCallback callback =
      new IRemotePecCallback.Stub() {
        @Override
        public void onMessage(String message) {
          PortableJson json = jsonParser.parse(message);
          pecInnerPort.onReceivePecMessage(json);
        }
      };

  @Inject
  RemotePec(ArcsServiceBridge bridge, PECInnerPortFactory pecInnerPortFactory,
      PortableJsonParser jsonParser) {
    this.bridge = bridge;
    this.pecInnerPortFactory = pecInnerPortFactory;
    this.jsonParser = jsonParser;
  }

  public void init(String arcId, String pecId, String recipe, Particle particle) {
    if (pecInnerPort != null) {
      throw new IllegalStateException("PEC has already been initialized.");
    }

    pecInnerPort = pecInnerPortFactory.createPECInnerPort(pecId, /* sessionId= */ null);
    if (particle != null) {
      pecInnerPort.mapParticle(particle);
    }

    bridge
        .connectToArcsService()
        .thenAccept(
            service -> {
              try {
                service.startArc(
                    arcId,
                    pecId,
                    recipe,
                    particle == null ? null : particle.getId(),
                    particle == null ? null : particle.getName(),
                    callback);
              } catch (RemoteException e) {
                throw new RuntimeException(e);
              }
            });
  }
}
