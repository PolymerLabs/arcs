package arcs.api;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public class ParticleBase implements Particle {
  public ParticleSpec spec;
  public PortableJsonParser jsonParser;
  protected Map<String, Handle> handleByName = new HashMap<>();
  protected Consumer<PortableJson> output;

  @Override
  public String getName() {
    return this.spec.name;
  }

  @Override
  public void setSpec(ParticleSpec spec) {
    // TODO: throw exception otherwise? pass spec into constructor?
    if (this.spec == null) {
      this.spec = spec;
    }
  }

  @Override
  public void setJsonParser(PortableJsonParser jsonParser) {
    this.jsonParser = jsonParser;
  }

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    // TODO: Should be async.
    // TODO: add startBusy & doneBusy support.
    // TODO: Add errors parameter.
    this.handleByName = handleByName;
  }

  @Override
  public Handle getHandle(String id) {
    if (!this.handleByName.containsKey(id)) {
      throw new AssertionError("Handle " + id + "does not exist");
    }
    return this.handleByName.get(id);
  }

  @Override
  public void onHandleSync(Handle handle, PortableJson model) {
    // TODO: Implement
  }

  @Override
  public void onHandleUpdate(Handle handle, PortableJson update) {
    // TODO: Implement
  }

  @Override
  public void onHandleDesync(Handle handle) {
    // TODO: Implement
  }

  @Override
  public void setOutput(Consumer<PortableJson> output) {
    this.output = output;
  }

  @Override
  public void renderModel() {
    if (this.output != null) {
      this.output.accept(jsonParser.emptyObject()
          // TODO: add support for slotName.
          .put("template", getTemplate(""))
          .put("model", getModel()));
    }
  }

  @Override
  public String getTemplate(String slotName) {
    return "";
  }

  @Override
  public String getModel() {
    return "";
  }
}
