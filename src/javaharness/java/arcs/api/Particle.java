package arcs.api;

import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/** Interface that all built in particles must implement to create particles. */
public interface Particle {
  String getId();
  void setId(String id); // TODO: should be a ctor parameter instead?

  String getName();

  void setSpec(ParticleSpec spec);

  void setJsonParser(PortableJsonParser jsonParser);

  void setHandles(Map<String, Handle> handleByName);

  Handle getHandle(String id);

  void onHandleSync(Handle handle, PortableJson model);

  void onHandleUpdate(Handle handle, PortableJson update);

  void onHandleDesync(Handle handle);

  // These APIs are copied from ui-particle.js
  // TODO: Consider adding a similar layer of abstraction, if needed.
  String getTemplate(String slotName);

  String getModel();

  void setOutput(Consumer<PortableJson> output);

  void output();
}
