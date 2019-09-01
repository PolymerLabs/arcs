package arcs.api;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class SlotProxy {
  public final String slotName;
  public final Particle particle;
  public final Map<String, String> providedSlots;
  public final Set<String> requestedContentTypes = new HashSet<>();
  private final PECInnerPort apiPort;
    private boolean isRendered = false;
  private PortableJsonParser jsonParser;
  // TODO: add event handling support:
  // private readonly handlers = new Map<string, ((event: {}) => void)[]>();

  SlotProxy(
      PECInnerPort apiPort,
      Particle particle,
      String slotName,
      Map<String, String> providedSlots,
      PortableJsonParser jsonParser) {
    this.apiPort = apiPort;
    this.slotName = slotName;
    this.particle = particle;
    this.providedSlots = providedSlots;
    this.jsonParser = jsonParser;
  }

  void render(String content) {
    PortableJson contentJson = jsonParser.parse(content);
    this.apiPort.Render(particle, slotName, contentJson);
    contentJson.forEach(requestedContentTypes::remove);
    // Slot is considered rendered, if a non-empty content was sent and all requested content types
    // were fullfilled.
     isRendered = requestedContentTypes.size() == 0 && contentJson.keys().size() == 0;
  }
  
  public boolean isRendered() {
    return isRendered;
  }
}
