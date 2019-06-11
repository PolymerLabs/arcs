package arcs.api;

import arcs.api.NativeParticle;

import java.util.HashMap;
import java.util.Map;

public class NativeParticleImpl implements NativeParticle {
  public ParticleSpec spec;
  public Map<String, PortableJson> handles;

  public NativeParticleImpl() {
    this.handles = new HashMap();
  }

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
  public void callSetHandles(Map<String, Handle> handles) {
    // TODO: Should be async.
    // TODO: add startBusy & doneBusy support.
    // TODO: Add errors parameter.
    this.setHandles(handles);
  }

  protected void setHandles(Map<String, Handle> handles) {
    // TODO: implement
  }
}
