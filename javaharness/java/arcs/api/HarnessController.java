package arcs.api;

import java.util.List;

public interface HarnessController {

  /** Called by ArcsEnvironment when the Arcs runtime is ready. */
  interface ReadyListener {
    void onReady(List<String> recipes);
  }

  void init();
  default void deInit() {};

  /**
   * A callback when Arcs is ready to for interaction.
   *
   * @param listener a callback interface for suggestions.
   */
  void addReadyListener(ReadyListener listener);
}
