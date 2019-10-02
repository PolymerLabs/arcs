package arcs.api;

import java.util.HashMap;
import java.util.Map;

import javax.inject.Inject;

public class UiBrokerImpl implements UiBroker {

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
  public boolean render(PortableJson content) {
    String[] names = null;
    if (content.getObject("data").hasKey("modality")) {
      String modality = content.getObject("data").getString("modality");
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
        rendered |= renderers.get(names[i]).render(content);
      }
    }
    return rendered;
  }
}
