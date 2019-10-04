package arcs.api;

import java.util.Map;

public interface ParticleExecutionContext {
  Particle instantiateParticle(
      String particleId,
      ParticleSpec spec,
      Map<String, StorageProxy> proxies,
      IdGenerator idGenerator);

  void initializeParticle(
      Particle particle,
      ParticleSpec spec,
      Map<String, StorageProxy> proxies,
      IdGenerator idGenerator);
}
