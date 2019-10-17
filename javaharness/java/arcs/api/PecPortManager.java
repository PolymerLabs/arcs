package arcs.api;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public class PecPortManager {

  private final ShellApi shellApi;
  private final ParticleExecutionContext pec;
  private final PortableJsonParser jsonParser;

  private final Map<String, PecInnerPort> pecPortMap = new HashMap<>();
  private final Map<String, PecInnerPortProxy> pecPortProxyMap = new HashMap<>();

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

    PecInnerPortProxy portProxy = pecPortProxyMap.get(pecId);
    if (portProxy != null) {
      portProxy.onReceivePecMessage(message);
      return;
    }

    // Create a new inner PEC port for this pecId.
    port = createInnerPecPort(pecId, sessionId);
    port.onReceivePecMessage(message);
  }

  public void addRemotePecPort(String pecId, PecInnerPortProxy pecInnerPortProxy) {
    pecPortProxyMap.put(pecId, pecInnerPortProxy);
  }

  public PecInnerPort getOrCreateInnerPort(String pecId, String sessionId) {
    PecInnerPort port = pecPortMap.get(pecId);
    if (port == null) {
      return createInnerPecPort(pecId, sessionId);
    } else {
      return port;
    }
  }

  public void removePecPort(String pecId) {
    pecPortMap.remove(pecId);
    pecPortProxyMap.remove(pecId);
  }

  private PecInnerPort createInnerPecPort(String pecId, String sessionId) {
    if (pecPortMap.containsKey(pecId)) {
      throw new IllegalArgumentException("Pec with ID " + pecId + " already exists.");
    }
    PecInnerPort pecInnerPort = new PecInnerPort(
      pecId, sessionId, shellApi, pec, jsonParser);
    pecPortMap.put(pecId, pecInnerPort);
    return pecInnerPort;
  }
}
