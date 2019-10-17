package arcs.api;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public class PecPortManager {

  private final ArcsMessageSender arcsMessageSender;
  private final ParticleExecutionContext pec;
  private final PortableJsonParser jsonParser;

  private final Map<String, PecInnerPort> pecPortMap = new HashMap<>();
  private final Map<String, PecInnerPortProxy> pecPortProxyMap = new HashMap<>();

  @Inject
  PecPortManager(
    ArcsMessageSender arcsMessageSender,
    ParticleExecutionContext pec,
    PortableJsonParser jsonParser) {
    this.arcsMessageSender = arcsMessageSender;
    this.pec = pec;
    this.jsonParser = jsonParser;
  }

  public void deliverPecMessage(String pecId, String sessionId, PortableJson message) {
    PecInnerPort port = pecPortMap.get(pecId);
    if (port != null) {
      port.onReceivePecMessage(message);
      return;
    }

    PecInnerPortProxy portProxy = pecPortProxyMap.get(pecId);
    if (portProxy != null) {
      portProxy.onReceivePecMessage(message);
      return;
    }

    // Create a new inner PEC port for this pecId.
    port = createPecInnerPort(pecId, sessionId);
    port.onReceivePecMessage(message);
  }

  public void addPecInnerPortProxy(String pecId, PecInnerPortProxy pecInnerPortProxy) {
    pecPortProxyMap.put(pecId, pecInnerPortProxy);
  }

  public PecInnerPort getOrCreatePecInnerPort(String pecId, String sessionId) {
    PecInnerPort port = pecPortMap.get(pecId);
    if (port == null) {
      return createPecInnerPort(pecId, sessionId);
    } else {
      return port;
    }
  }

  public void removePecPort(String pecId) {
    // TODO: split and verify this method is called correctly.
    if (pecPortMap.remove(pecId) != null) {
      return;
    } else if (pecPortProxyMap.remove(pecId) != null) {
      return;
    }

    throw new IllegalArgumentException("Pec with ID " + pecId + " doesn't exist.");
  }

  private PecInnerPort createPecInnerPort(String pecId, String sessionId) {
    if (pecPortMap.containsKey(pecId)) {
      throw new IllegalArgumentException("Pec with ID " + pecId + " already exists.");
    }
    PecInnerPort pecInnerPort = new PecInnerPort(
      pecId, sessionId, arcsMessageSender, pec, jsonParser);
    pecPortMap.put(pecId, pecInnerPort);
    return pecInnerPort;
  }
}
