package arcs.api;

public interface UiBroker {
  boolean render(PortableJson content);

  UiRenderer getRenderer(String modality);

  void registerRenderer(String modality, UiRenderer renderer);
}
