package arcs.api;

import java.util.Map;
import java.util.function.Consumer;

public final class ProxiedClientParticle implements Particle {

  @Override
  public String getName() {
    // TODO?
    return null;
  }

  @Override
  public void setSpec(ParticleSpec spec) {
    throw new UnsupportedOperationException("Not required for ProxiedClientParticle.");
  }

  @Override
  public void setJsonParser(PortableJsonParser jsonParser) {
    throw new UnsupportedOperationException("Not required for ProxiedClientParticle.");
  }

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    throw new UnsupportedOperationException("Not required for ProxiedClientParticle.");
  }

  @Override
  public Handle getHandle(String id) {
    throw new UnsupportedOperationException("Not required for ProxiedClientParticle.");
  }

  @Override
  public void onHandleSync(Handle handle, PortableJson model) {

  }

  @Override
  public void onHandleUpdate(Handle handle, PortableJson update) {

  }

  @Override
  public void onHandleDesync(Handle handle) {

  }

  @Override
  public String getTemplate(String slotName) {
    throw new UnsupportedOperationException("Not required for ProxiedClientParticle.");
  }

  @Override
  public String getModel() {
    throw new UnsupportedOperationException("Not required for ProxiedClientParticle.");
  }

  @Override
  public void setOutput(Consumer<PortableJson> output) {

  }

  @Override
  public void renderModel() {

  }
}
