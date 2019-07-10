package arcs.api;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class NativeParticleImpl implements NativeParticle {
  public ParticleSpec spec;
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
  public void setHandles(Map<String, Handle> handleByName) {
    // TODO: Should be async.
    // TODO: add startBusy & doneBusy support.
    // TODO: Add errors parameter.
    this.handleByName = handleByName;
  }

  @Override
  public void onHandleSync(Handle handle, PortableJson model) {
    // TODO: Implement
  }

  @Override
  public void onHandleUpdate(Handle handle, PortableJson data) {
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
    contentTypes.forEach(type -> slot.requestedContentTypes.add(type));
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
