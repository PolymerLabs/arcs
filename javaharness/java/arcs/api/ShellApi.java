package arcs.api;

public interface ShellApi {

  interface Proxy {
    void onMessage(String message);
  }

  /**
   * Send an entity to Arcs. To understand what kinds of entities are supported and in what formats,
   * see https://github.com/PolymerLabs/arcs/blob/master/shells/web-shell/elements/pipes/
   *
   * @param message a message in JSON format
   */
  void sendMessageToArcs(String message);

  /**
   * Attach a message proxy.
   */
  void attachProxy(Proxy proxy);
}
