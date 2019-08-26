package arcs.builtinparticles;

import arcs.api.AlertSurface;
import arcs.api.ClipboardSurface;
import arcs.api.Collection;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

public class CaptureEntity extends ParticleBase {

  private PortableJsonParser parser;
  private final ClipboardSurface clipboardSurface;

  public CaptureEntity(/*EntityObserver entityObserver*/ PortableJsonParser parser,
      ClipboardSurface clipboardSurface) {
    //    entityObserver.registerListener(this);
    this.parser = parser;
    this.clipboardSurface = clipboardSurface;
  }

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    super.setHandles(handleByName);
    Handle handle = handleByName.get("entities");

    if ("entities".equals(handle.name)) {
      clipboardSurface.listen(text -> {
        String jsonData = parser.stringify(parser
            .emptyObject()
            .put("name", "Google Office")
            .put("address", text));
        onEntity(
            parser
                .emptyObject()
                .put("type", "place")
                .put("source", "com.google.chat")
                .put(
                    "jsonData",
                    jsonData));
      });

    }
  }

  @Override
  public void onHandleSync(Handle handle, PortableJson model) {
    Logger.getGlobal().log(Level.SEVERE, "Arcs: onHandleSync name " + handle.name);

//    if ("entities".equals(handle.name)) {
//      Logger.getGlobal().log(Level.SEVERE, "Arcs: Setting place entity");
//      String jsonData = parser.stringify(parser
//          .emptyObject()
//          .put("name", "Google Office")
//          .put("address", "325 Spear St, San Francisco, Ca"));
//      onEntity(
//          parser
//              .emptyObject()
//              .put("type", "place")
//              .put("source", "com.google.chat")
//              .put(
//                  "jsonData",
//                  jsonData));
//    }
  }

//  @Override
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
