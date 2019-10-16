package arcs.api;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public final class PecPortManager {

  private final Map<String, PecInnerPort> pecPortMap = new HashMap<>();
  private final Map<String, PecPortProxy> pecPortProxyMap = new HashMap<>();

  private final ShellApi shellApi;
  private final ParticleExecutionContext pec;
  private final PortableJsonParser jsonParser;

  @Inject
  PecPortManager(
      ShellApi shellApi,
      ParticleExecutionContext pec,
      PortableJsonParser jsonParser) {
    this.shellApi = shellApi;
    this.pec = pec;
    this.jsonParser = jsonParser;
  }

  public void deliverPecMessage(String pecId, String sessionId, PortableJson message) {
    PecInnerPort port = pecPortMap.get(pecId);
    if (port != null) {
      port.onReceivePecMessage(message);
      return;
    }

    PecPortProxy portProxy = pecPortProxyMap.get(pecId);
    if (portProxy != null) {
      portProxy.onReceivePecMessage(message);
      return;
    }

    // Create a new inner PEC port for this pecId.
    port = createPecPort(pecId, sessionId);
    port.onReceivePecMessage(message);
  }

  public void addPecPortProxy(String pecId, PecPortProxy pecPortProxy) {
    pecPortProxyMap.put(pecId, pecPortProxy);
  }

  public PecInnerPort getOrCreatePecPort(String pecId, String sessionId) {
    PecInnerPort port = pecPortMap.get(pecId);
    if (port == null) {
      return createPecPort(pecId, sessionId);
    } else {
      return  port;
    }
  }

  public void removePecPort(String pecId) {
    pecPortMap.remove(pecId);
    pecPortProxyMap.remove(pecId);
  }

  private PecInnerPort createPecPort(String pecId, String sessionId) {
    if (pecPortMap.containsKey(pecId)) {
      throw new IllegalArgumentException("Pec with ID " + pecId + " already exists.");
    }

    PecInnerPort pecInnerPort = new PecInnerPort(pecId, sessionId, shellApi, pec, jsonParser);
    pecPortMap.put(pecId, pecInnerPort);
    return pecInnerPort;
  }
}
