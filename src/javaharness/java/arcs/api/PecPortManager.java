package arcs.api;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public class PecPortManager {

  private final Map<String, PecMessageReceiver> ports = new HashMap<>();
  private final PECInnerPortFactory portFactory;

  @Inject
  PecPortManager(PECInnerPortFactory portFactory) {
    this.portFactory = portFactory;
  }

  public void deliverPecMessage(String pecId, String sessionId, PortableJson message) {
    PecMessageReceiver port = ports.get(pecId);
    if (port == null) {
      // Create a new inner PEC port for this pecId.
      port = createInnerPecPort(pecId, sessionId);
    }

    port.onReceivePecMessage(message);
  }

  // TODO(csilvestrini): Hook this up to IArcsService.
  public RemotePecPort createRemotePecPort(String pecId) {
    if (ports.containsKey(pecId)) {
      throw new IllegalArgumentException("pecId already exists: " + pecId);
    }
    RemotePecPort remotePecPort = new RemotePecPort();
    ports.put(pecId, remotePecPort);
    return remotePecPort;
  }

  public PECInnerPort getOrCreateInnerPort(String pecId, String sessionId) {
    PecMessageReceiver port = ports.get(pecId);
    if (port == null) {
      return createInnerPecPort(pecId, sessionId);
    } else if (port instanceof PECInnerPort) {
      return (PECInnerPort) port;
    } else {
      throw new IllegalArgumentException(
          String.format("PEC with ID %s is not an inner port: ", pecId));
    }
  }

  private PECInnerPort createInnerPecPort(String pecId, String sessionId) {
    PECInnerPort pecInnerPort = portFactory.createPECInnerPort(pecId, sessionId);
    ports.put(pecId, pecInnerPort);
    return pecInnerPort;
  }
}
