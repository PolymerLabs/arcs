package arcs.api;

/**
 * Exposed to JS so that Javascript can call Java.
 */
public interface DeviceClient {
    // Receives a message from Arcs JS shell.
    void receive(String json);
}
