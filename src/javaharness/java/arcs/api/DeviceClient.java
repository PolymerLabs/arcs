package arcs.api;

/**
 * Exposed to JS so that Javascript can call Java.
 */
public interface DeviceClient {
    void foundSuggestions(String transactionId, String content);
    void shellReady();
    void notifyAutofillTypes(String types);
    void postMessage(String msg);
}
