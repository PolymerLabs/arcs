package arcs.android;

import java.util.HashMap;
import java.util.Map;

import javax.inject.Inject;

import arcs.api.PortableJson;
import arcs.api.UiBroker;
import arcs.api.UiRenderer;

public class AndroidUiBroker implements UiBroker {

  private static final String MODALITY_FIELD = "modality";

  private final Map<String, UiRenderer> renderers = new HashMap<>();

  @Inject
  AndroidUiBroker() {}

  @Override
  public void registerRenderer(String modality, UiRenderer renderer) {
    renderers.put(modality, renderer);
  }

  @Override
  public boolean render(PortableJson packet) {
    String[] names;
    if (packet.hasKey(MODALITY_FIELD)) {
      String modality = packet.getString(MODALITY_FIELD);
      names = modality.split(",");
    } else {
      names = renderers.keySet().toArray(new String[renderers.size()]);
    }
    if (names.length == 0) {
      throw new AssertionError("No render for content");
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
