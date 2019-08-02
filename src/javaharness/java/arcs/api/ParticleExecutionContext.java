package arcs.api;

import java.util.Map;

public interface ParticleExecutionContext {
    Particle instantiateParticle(ParticleSpec spec, Map<String, StorageProxy> proxies);
}
