package arcs.api;

public interface ShellApi {
    void observeEntity(String entityJson);

    String receiveEntity(String entityJson);

    void chooseSuggestion(String suggestion);

    void postMessage(String msgToSendToHost);
}
