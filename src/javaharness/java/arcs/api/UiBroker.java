package arcs.api;

public interface UiBroker {
  boolean render(PortableJson content);

  void registerRenderer(String modality, UiRenderer renderer);
}
