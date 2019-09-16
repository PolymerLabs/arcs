package arcs.android.client;

import android.os.RemoteException;
import arcs.android.api.IRemotePecCallback;
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

  public void init() {
    if (pecInnerPort != null) {
      throw new IllegalStateException("PEC has already been initialized.");
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
                service.registerRemotePec(pecId, callback);

                // TODO(csilvestrini): Add particles and run arc.

              } catch (RemoteException e) {
                throw new RuntimeException(e);
              }
            });
  }
}
