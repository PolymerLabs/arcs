package arcs.api;

import java.util.Optional;

public interface ParticleLoader {
  Optional<ParticleFactory> loadParticle(String particleName);
}
