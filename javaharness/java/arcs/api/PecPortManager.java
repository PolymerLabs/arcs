package arcs.api;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public class PecPortManager {

  private final Map<String, PecMessageReceiver> ports = new HashMap<>();
  private final PecInnerPortFactory portFactory;

  @Inject
  PecPortManager(PecInnerPortFactory portFactory) {
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

  public void addRemotePecPort(String pecId, RemotePecPort remotePecPort) {
    ports.put(pecId, remotePecPort);
  }

  public PecInnerPort getOrCreateInnerPort(String pecId, String sessionId) {
    PecMessageReceiver port = ports.get(pecId);
    if (port == null) {
      return createInnerPecPort(pecId, sessionId);
    } else if (port instanceof PecInnerPort) {
      return (PecInnerPort) port;
    } else {
      throw new IllegalArgumentException("PEC with ID %s is not an inner port: " + pecId);
    }
  }

  public void removePecPort(String pecId) {
    ports.remove(pecId);
  }

  private PecInnerPort createInnerPecPort(String pecId, String sessionId) {
    if (ports.containsKey(pecId)) {
      throw new IllegalArgumentException("Pec with ID " + pecId + " already exists.");
    }
    PecInnerPort pecInnerPort = portFactory.createPECInnerPort(pecId, sessionId);
    ports.put(pecId, pecInnerPort);
    return pecInnerPort;
  }
}
