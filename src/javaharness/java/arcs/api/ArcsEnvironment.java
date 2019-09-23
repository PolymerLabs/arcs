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
    void onReady(List<String> recipes);
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
   * Fires an event to notify listener when given transaction-id data is available.
   * TODO: DataListeners are deprecated, remove.
   */
  default void fireDataEvent(String tid, String data) {}

  /**
   * A callback when Arcs is ready to for interaction.
   *
   * @param listener a callback interface for suggestions.
   */
  default void addReadyListener(ReadyListener listener) {}

  /**
   * Fires an event to notify listeners when Arcs is ready for interaction.
   */
  default void fireReadyEvent(List<String> recipes) {}

  /** Initialize Arcs */
  default void init() {}

  /** Reset Arcs to the Launcher state. */
  default void reset() {}

  /** Tear down any resources used by the environment. */
  default void destroy() {}

  /** Cause Arcs full screen UI to be shown. */
  default void show() {}

  /** Cause Arcs full screen UI to be hidden. */
  default void hide() {}
}
