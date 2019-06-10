package arcs.api;

import java.util.Optional;

public interface NativeParticleLoader {
    Optional<NativeParticleFactory> loadParticle(String particleName);
}
