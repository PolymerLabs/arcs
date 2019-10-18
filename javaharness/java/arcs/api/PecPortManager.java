package arcs.api;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public class PecPortManager {

  private final ArcsMessageSender arcsMessageSender;
  private final PortableJsonParser jsonParser;
  private final HandleFactory handleFactory;

  private final Map<String, PecInnerPort> pecPortMap = new HashMap<>();
  private final Map<String, PecInnerPortProxy> pecInnerPortProxyMap = new HashMap<>();

  @Inject
  PecPortManager(
      ArcsMessageSender arcsMessageSender,
      PortableJsonParser jsonParser,
      HandleFactory handleFactory) {
    this.arcsMessageSender = arcsMessageSender;
    this.jsonParser = jsonParser;
    this.handleFactory = handleFactory;
  }

  public void deliverPecMessage(String pecId, String sessionId, PortableJson message) {
    PecInnerPort port = pecPortMap.get(pecId);
    if (port != null) {
      port.onReceivePecMessage(message);
      return;
    }

    PecInnerPortProxy pecInnerPortProxy = pecInnerPortProxyMap.get(pecId);
    if (pecInnerPortProxy != null) {
      pecInnerPortProxy.onReceivePecMessage(message);
      return;
    }

    // Create a new inner PEC port for this pecId.
    port = createPecPort(pecId, sessionId);
    port.onReceivePecMessage(message);
  }

  public void addPecInnerPortProxy(String pecId, PecInnerPortProxy pecInnerPortProxy) {
    pecInnerPortProxyMap.put(pecId, pecInnerPortProxy);
  }

  public PecInnerPort getOrCreatePecInnerPort(String pecId, String sessionId) {
    PecInnerPort port = pecPortMap.get(pecId);
    if (port == null) {
      return createPecPort(pecId, sessionId);
    } else {
      return  port;
    }
  }

  public void removePecPort(String pecId) {
    // TODO: split and verify this method is called correctly.
    if (pecPortMap.remove(pecId) != null) {
      return;
    } else if (pecInnerPortProxyMap.remove(pecId) != null) {
      return;
    }

    throw new IllegalArgumentException("Pec with ID " + pecId + " doesn't exist.");
  }

  private PecInnerPort createPecPort(String pecId, String sessionId) {
    if (pecPortMap.containsKey(pecId)) {
      throw new IllegalArgumentException("Pec with ID " + pecId + " already exists.");
    }

    PecInnerPort pecInnerPort = new PecInnerPort(
        pecId, sessionId, arcsMessageSender, jsonParser, handleFactory);
    pecPortMap.put(pecId, pecInnerPort);
    return pecInnerPort;
  }
}
