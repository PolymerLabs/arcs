package arcs.api;

/** Exposed to JS so that Javascript can call Java. */
public interface DeviceClient {
  // Receives a message from Arcs JS shell.
  void receive(String json);
  // Sends message to Arcs service to start an arc.
  void startArc(String json, Particle particle);
}
