package arcs.api;

import java.util.List;
import java.util.Map;

/**
 * Interface that all 'Native' built in particles must implement to create particles.
 */
public interface NativeParticle {
  String getName();

  void setSpec(ParticleSpec spec);

  void setHandles(Map<String, Handle> handleByName);

  void onHandleSync(Handle handle, PortableJson model);
  void onHandleUpdate(Handle handle, PortableJson data);

  SlotProxy getSlot(String name);
  boolean hasSlotProxy(String name);
  void addSlotProxy(SlotProxy slotProxy);
  void removeSlotProxy(String name);
  void renderSlot(String slotName, List<String> contentTypes);

  // These APIs are copied from dom-particle-base.ts
  // TODO: Consider adding a similar layer of abstraction, if needed.
  boolean shouldRender(String slotName);
  String getTemplate(String slotName);
  String getTemplateName(String slotName);
  String getModel();
}
