package arcs.android.client;

import android.os.RemoteException;
import android.util.Log;
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

  private static final String TAG = "Arcs";

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

  public void init(Particle particle) {
    if (pecInnerPort != null) {
      // TODO: RemotePec is being initialized from onFillRequest, so repeated calls are being made.
      // It should should be initialized on service start up, and the particle be updated onFillRequest.
      // Here should be an exception instead.
      Log.d(TAG, "PEC has already been initialized.");
      return;
      // throw new IllegalStateException("PEC has already been initialized.");
    }

    // TODO(csilvestrini): Generate these properly.
    String pecId = "example-remote-pec";
    String sessionId = "example-session-id";
    pecInnerPort = pecInnerPortFactory.createPECInnerPort(pecId, sessionId);

    bridge
        .connectToArcsService()
        .thenAccept(
            service -> {
              try {
                if (particle != null) {
                  pecInnerPort.mapParticle(particle);
                }
                service.registerRemotePec(pecId, callback);

                // TODO(csilvestrini): Add particles and run arc.

              } catch (RemoteException e) {
                throw new RuntimeException(e);
              }
            });
  }
}
