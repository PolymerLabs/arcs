package arcs.api;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;

public class UiBrokerImpl implements UiBroker {

  private static final String MODALITY_FIELD = "modality";

  protected final Map<String, UiRenderer> renderers = new HashMap<>();

  @Inject
  public UiBrokerImpl(Map<String, UiRenderer> renderers) {
    this.renderers.putAll(renderers);
  }

  @Override
  public UiRenderer getRenderer(String modality) {
    if (!renderers.containsKey(modality)) {
      throw new IllegalArgumentException("No renderer for modality " + modality);
    }
    return renderers.get(modality);
  }

  @Override
  public void registerRenderer(String modality, UiRenderer renderer) {
    renderers.put(modality, renderer);
  }

  @Override
  public boolean render(PortableJson packet) {
    String[] names = null;
    if (packet.hasKey(MODALITY_FIELD)) {
      String modality = packet.getString(MODALITY_FIELD);
      names = modality.split(",");
    } else {
      names = renderers.keySet().toArray(new String[renderers.size()]);
    }
    if (names.length == 0) {
      throw new AssertionError("No renderers for content");
    }

    boolean rendered = false;
    for (int i = 0; i < names.length; ++i) {
      if (renderers.containsKey(names[i])) {
        rendered |= renderers.get(names[i]).render(packet);
      }
    }
    return rendered;
  }
}
