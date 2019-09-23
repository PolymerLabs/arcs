package arcs.api;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;
import javax.inject.Inject;

public class UiBrokerImpl implements UiBroker {

  private final Map<String, UiRenderer> renderers = new HashMap<>();

  @Inject
  public UiBrokerImpl(Map<String, UiRenderer> renderers) {
    this.renderers.putAll(renderers);
  }

  @Override
  public void registerRenderer(String modality, UiRenderer renderer) {
    if (this.renderers.containsKey(modality)) {
      // TODO: should multiple renderers per modality be supported?
      throw new IllegalStateException("Renderer already registered for " + modality);
    }
    renderers.put(modality, renderer);
  }

  @Override
  public boolean render(PortableJson content) {
    String[] names = null;
    if (content.getObject("data").hasKey("modality")) {
      String modality = content.getObject("da`ta").getString("modality");
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
