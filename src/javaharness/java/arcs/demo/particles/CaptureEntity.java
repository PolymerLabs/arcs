package arcs.demo.particles;

import arcs.demo.services.ClipboardService;
import arcs.api.Collection;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import java.util.Map;

public class CaptureEntity extends ParticleBase {

  private PortableJsonParser parser;
  private final ClipboardService clipboardService;

  public CaptureEntity(PortableJsonParser parser, ClipboardService clipboardService) {
    this.parser = parser;
    this.clipboardService = clipboardService;
  }

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    super.setHandles(handleByName);
    Handle handle = handleByName.get("entities");

    if ("entities".equals(handle.name)) {
      clipboardService.listen(
          text -> {
            String jsonData =
                parser.stringify(
                    parser.emptyObject().put("name", "Google Office").put("address", text));
            onEntity(
                parser
                    .emptyObject()
                    .put("type", "place")
                    .put("source", "com.google.chat")
                    .put("jsonData", jsonData));
          });
    }
  }

  public void onEntity(PortableJson entity) {
    if (!entity.hasKey("type") || entity.getString("type") == null) {
      throw new AssertionError("Incoming entity missing `type`");
    }
    if (!entity.hasKey("source") || entity.getString("source") == null) {
      throw new AssertionError("Incoming entity missing `source`");
    }
    if (!entity.hasKey("jsonData") || entity.getString("jsonData") == null) {
      throw new AssertionError("Incoming entity missing serialized `jsonData`");
    }

    ((Collection) getHandle("entities")).store(jsonParser.emptyObject().put("rawData", entity));
  }
}
