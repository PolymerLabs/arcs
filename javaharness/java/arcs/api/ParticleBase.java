package arcs.api;

import android.util.Log;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

public class ParticleBase implements Particle {
  private String id;
  public ParticleSpec spec;
  public PortableJsonParser jsonParser;
  protected Map<String, Handle> handleByName = new HashMap<>();
  protected Consumer<PortableJson> outputConsumer;

  @Override
  public String getId() {
    return id;
  }

  @Override
  public void setId(String id) {
    this.id = id;
  }

  @Override
  public String getName() {
    return this.spec == null ? this.getClass().getSimpleName() : this.spec.name;
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
    Log.d("Arcs", "setHandles " + handleByName.size());
    for (String key : handleByName.keySet()) {
      Log.d("Arcs", "setHandles for key " + key);
    }
    this.handleByName = handleByName;
  }

  @Override
  public Handle getHandle(String id) {
    Log.d("Arcs", "getHandle for " + id);
    if (!this.handleByName.containsKey(id)) {
      throw new AssertionError("Handle " + id + "does not exist");
    }

    Log.d("Arcs", "getHandle");
    return this.handleByName.get(id);
  }

  @Override
  public void setOutput(Consumer<PortableJson> output) {
    this.outputConsumer = output;
  }

  @Override
  public void output() {
    if (this.outputConsumer != null) {
      this.outputConsumer.accept(jsonParser.emptyObject()
          // TODO: add support for slotName.
          .put("template", getTemplate(""))
          .put("model", getModel()));
    }
  }
}
