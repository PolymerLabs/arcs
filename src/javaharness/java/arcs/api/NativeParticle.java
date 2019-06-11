package arcs.api;

import java.util.Map;

/**
 * Interface that all 'Native' built in particles must implement to create particles.
 */
public interface NativeParticle {
  String getName();

  void setSpec(ParticleSpec spec);

  public void callSetHandles(Map<String, Handle> handles);
}
