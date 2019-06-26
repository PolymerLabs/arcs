package arcs.api;

/**
 * Exposed to JS so that Javascript can call Java.
 */
public interface DeviceClient {
    void receive(String json);
}
