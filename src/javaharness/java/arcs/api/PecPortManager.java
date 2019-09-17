package arcs.api;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Singleton;

@Singleton
public class PecPortManager {

  private final Map<String, PecMessageReceiver> allPorts = new HashMap<>();
  private final Map<String, RemotePecPort> remotePorts = new HashMap<>();
  private final Map<String, PECInnerPort> innerPorts = new HashMap<>();
  private final PECInnerPortFactory portFactory;

  @Inject
  PecPortManager(PECInnerPortFactory portFactory) {
    this.portFactory = portFactory;
  }

  public void deliverPecMessage(String pecId, String sessionId, PortableJson message) {
    PecMessageReceiver port = allPorts.get(pecId);
    if (port == null) {
      // Create a new inner PEC port for this pecId.
      port = createInnerPecPort(pecId, sessionId);
    }

    port.onReceivePecMessage(message);
  }

  // TODO(csilvestrini): Hook this up to IArcsService.
  public RemotePecPort createRemotePecPort(String pecId) {
    if (allPorts.containsKey(pecId)) {
      throw new IllegalArgumentException("pecId already exists: " + pecId);
    }
    RemotePecPort remotePecPort = new RemotePecPort();
    remotePorts.put(pecId, remotePecPort);
    allPorts.put(pecId, remotePecPort);
    return remotePecPort;
  }

  public PECInnerPort getOrCreateInnerPort(String pecId, String sessionId) {
    PECInnerPort pecInnerPort = innerPorts.get(pecId);
    if (pecInnerPort != null) {
      return pecInnerPort;
    }
    if (remotePorts.containsKey(pecId)) {
      throw new IllegalArgumentException("pecId is a remote PEC port, not an inner port: " + pecId);
    }

    return createInnerPecPort(pecId, sessionId);
  }

  private PECInnerPort createInnerPecPort(String pecId, String sessionId) {
    PECInnerPort pecInnerPort = portFactory.createPECInnerPort(pecId, sessionId);
    innerPorts.put(pecId, pecInnerPort);
    allPorts.put(pecId, pecInnerPort);
    return pecInnerPort;
  }
}
