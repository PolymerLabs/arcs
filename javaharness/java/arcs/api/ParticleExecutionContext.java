package arcs.api;

import java.util.Map;

public interface ParticleExecutionContext {
  void initializeParticle(
      Particle particle,
      ParticleSpec spec,
      Map<String, StorageProxy> proxies,
      IdGenerator idGenerator);
}
