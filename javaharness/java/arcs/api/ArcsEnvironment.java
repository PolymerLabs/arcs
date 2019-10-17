package arcs.api;

/**
 * Encapsulates the execution environment for Arcs, which can be implemented, for example, as a
 * WebView, a separate Javascript interpreter, a WASM-ahead-of-time compiled or native code base.
 */
public interface ArcsEnvironment {

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
