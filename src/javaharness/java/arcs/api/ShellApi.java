package arcs.api;

/** An API for Java to call Javascript (shell). */
public interface ShellApi {
  // Sends a message to Arcs JS shell.
  String receive(String json);
}
