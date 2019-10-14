package arcs.api;

public interface PecPortManager {

  void deliverPecMessage(String pecId, String sessionId, PortableJson message);

  void addPecPortProxy(String pecId, PecPortProxy pecPortProxy);

  PecPort getOrCreatePecPort(String pecId, String sessionId);

  void removePecPort(String pecId);
}
