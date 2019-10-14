package arcs.api;

public interface UiBroker {

  void registerRenderer(String modality, UiRenderer renderer);

  boolean render(PortableJson packet);
}
