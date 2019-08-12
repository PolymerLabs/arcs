package arcs.api;

import java.util.List;

/**
 * Encapsulates the execution environment for Arcs, which can be implemented, for example, as a
 * WebView, a separate Javascript interpreter, a WASM-ahead-of-time compiled or native code base.
 */
public interface ArcsEnvironment {

  /** Called by ArcsEnvironment when data is sent from Arcs. */
  interface DataListener {
    void onData(String arcId, String data);
  }

  /** Called by ArcsEnvironment when the Arcs runtime is ready. */
  interface ReadyListener {
    void onReady(List<String> autofillTypes);
  }

  /**
   * Send an entity to Arcs. To understand what kinds of entities are supported and in what formats,
   * see https://github.com/PolymerLabs/arcs/blob/master/shells/web-shell/elements/pipes/
   *
   * @param msg a message in JSON format
   * @param listener an optional callback, triggered when Arcs replies to this message.
   */
  void sendMessageToArcs(String msg, DataListener listener);

  /**
   * A callback when Arcs is ready to for interaction.
   *
   * @param listener a callback interface for suggestions.
   */
  void addReadyListener(ReadyListener listener);

  /** Initialize Arcs */
  void init();

  /** Reset Arcs to the Launcher state. */
  void reset();

  /** Tear down any resources used by the environment. */
  void destroy();

  /** Cause Arcs full screen UI to be shown. */
  void show();

  /** Cause Arcs full screen UI to be hidden. */
  void hide();
}
