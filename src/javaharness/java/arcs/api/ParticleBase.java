package arcs.api;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ParticleBase implements Particle {
  public ParticleSpec spec;
  public PortableJsonParser jsonParser;
  protected Map<String, Handle> handleByName = new HashMap<>();
  protected Map<String, SlotProxy> slotProxyByName = new HashMap<>();

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
  public SlotProxy getSlot(String name) {
    return slotProxyByName.get(name);
  }

  @Override
  public boolean hasSlotProxy(String name) {
    return slotProxyByName.containsKey(name);
  }

  @Override
  public void addSlotProxy(SlotProxy slotProxy) {
    slotProxyByName.put(slotProxy.slotName, slotProxy);
  }

  @Override
  public void removeSlotProxy(String name) {
    slotProxyByName.remove(name);
  }

  @Override
  public void renderSlot(String slotName, List<String> contentTypes) {
    SlotProxy slot = getSlot(slotName);
    if (slot == null) {
      // Did not receive StartRender
      return;
    }
    slot.requestedContentTypes.addAll(contentTypes);
    StringBuilder content = new StringBuilder("{");
    if (shouldRender(slotName)) {
      content.append("\"templateName\":\"").append(getTemplateName(slotName)).append("\", ");
      if (slot.requestedContentTypes.contains("template")) {
        content.append("\"template\":\"").append(getTemplate(slotName)).append("\", ");
      }
      if (slot.requestedContentTypes.contains("model")) {
        content.append("\"model\":").append(getModel());
      }
    }
    content.append("}");
    slot.render(content.toString());
  }

  @Override
  public boolean shouldRender(String slotName) {
    return true;
  }

  @Override
  public String getTemplateName(String slotName) {
    return "default";
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
