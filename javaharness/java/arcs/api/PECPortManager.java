package arcs.api;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public final class PECPortManager {

  private final Map<String, PECInnerPort> pecPortMap = new HashMap<>();
  private final Map<String, PECPortProxy> pecPortProxyMap = new HashMap<>();

  private final ShellApi shellApi;
  private final ParticleExecutionContext pec;
  private final PortableJsonParser jsonParser;

  @Inject
  PECPortManager(
      ShellApi shellApi,
      ParticleExecutionContext pec,
      PortableJsonParser jsonParser) {
    this.shellApi = shellApi;
    this.pec = pec;
    this.jsonParser = jsonParser;
  }

  public void deliverPecMessage(String pecId, String sessionId, PortableJson message) {
    PECInnerPort port = pecPortMap.get(pecId);
    if (port != null) {
      port.onReceivePecMessage(message);
      return;
    }

    PECPortProxy portProxy = pecPortProxyMap.get(pecId);
    if (portProxy != null) {
      portProxy.onReceivePecMessage(message);
      return;
    }

    // Create a new inner PEC port for this pecId.
    port = createPecPort(pecId, sessionId);
    port.onReceivePecMessage(message);
  }

  public void addPecPortProxy(String pecId, PECPortProxy pecPortProxy) {
    pecPortProxyMap.put(pecId, pecPortProxy);
  }

  public PECInnerPort getOrCreatePecPort(String pecId, String sessionId) {
    PECInnerPort port = pecPortMap.get(pecId);
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

  private PECInnerPort createPecPort(String pecId, String sessionId) {
    if (pecPortMap.containsKey(pecId)) {
      throw new IllegalArgumentException("Pec with ID " + pecId + " already exists.");
    }

    PECInnerPort pecInnerPort = new PECInnerPort(pecId, sessionId, shellApi, pec, jsonParser);
    pecPortMap.put(pecId, pecInnerPort);
    return pecInnerPort;
  }
}
