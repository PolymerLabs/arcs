package arcs.api;

import java.util.Map;

public interface ParticleExecutionContext {
    NativeParticle instantiateParticle(ParticleSpec spec, Map<String, StorageProxy> proxies);
}
