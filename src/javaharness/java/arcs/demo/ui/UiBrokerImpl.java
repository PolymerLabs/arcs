package arcs.demo.ui;

import arcs.api.PortableJson;
import arcs.api.UiBroker;
import arcs.api.UiRenderer;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;
import javax.inject.Inject;

class UiBrokerImpl implements UiBroker {

  private final Map<String, UiRenderer> renderers;

  @Inject
  UiBrokerImpl(Map<String, UiRenderer> renderers) {
    this.renderers = renderers;
  }

  @Override
  public boolean render(PortableJson content) {
    String modality = content.getObject("data").getString("modality");
    String[] names = modality.split(",");
    if (names.length == 0) {
      return false;
    }
    for (int i = 0; i < names.length; ++i) {
      if (renderers.containsKey(names[i])) {
        renderers.get(names[i]).render(content);
      }
    }
    return true;
  }
}
