package arcs.api;

public interface UiBroker {
  boolean render(PortableJson content);

  /** Adds a new {@link UiRenderer} at runtime. */
  void addRenderer(String name, UiRenderer renderer);
}
