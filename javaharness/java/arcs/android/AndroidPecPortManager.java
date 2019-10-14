package arcs.android;

import java.util.HashMap;
import java.util.Map;

import javax.inject.Inject;

import arcs.api.ParticleExecutionContext;
import arcs.api.PecPort;
import arcs.api.PecPortManager;
import arcs.api.PecPortProxy;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.ShellApi;

public class AndroidPecPortManager implements PecPortManager {

  private final Map<String, PecPort> pecPortMap = new HashMap<>();
  private final Map<String, PecPortProxy> pecPortProxyMap = new HashMap<>();

  private final ShellApi shellApi;
  private final ParticleExecutionContext pec;
  private final PortableJsonParser jsonParser;

  @Inject
  AndroidPecPortManager(
    ShellApi shellApi,
    ParticleExecutionContext pec,
    PortableJsonParser jsonParser) {
    this.shellApi = shellApi;
    this.pec = pec;
    this.jsonParser = jsonParser;
  }

  @Override
  public void deliverPecMessage(String pecId, String sessionId, PortableJson message) {
    PecPort port = pecPortMap.get(pecId);
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

  @Override
  public void addPecPortProxy(String pecId, PecPortProxy pecPortProxy) {
    pecPortProxyMap.put(pecId, pecPortProxy);
  }

  @Override
  public PecPort getOrCreatePecPort(String pecId, String sessionId) {
    PecPort port = pecPortMap.get(pecId);
    if (port == null) {
      return createPecPort(pecId, sessionId);
    } else {
      return  port;
    }
  }

  @Override
  public void removePecPort(String pecId) {
    pecPortMap.remove(pecId);
    pecPortProxyMap.remove(pecId);
  }

  private PecPort createPecPort(String pecId, String sessionId) {
    if (pecPortMap.containsKey(pecId)) {
      throw new IllegalArgumentException("Pec with ID " + pecId + " already exists.");
    }

    PecPort pecPort = new PecPort(pecId, sessionId, shellApi, pec, jsonParser);
    pecPortMap.put(pecId, pecPort);
    return pecPort;
  }
}
