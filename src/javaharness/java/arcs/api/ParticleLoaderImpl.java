package arcs.api;

import java.util.Optional;
import java.util.Set;
import javax.inject.Inject;

public class ParticleLoaderImpl implements ParticleLoader {
  private Set<ParticleFactory> particleFactories;

  @Inject
  public ParticleLoaderImpl(Set<ParticleFactory> particleFactories) {
    this.particleFactories = particleFactories;
  }

  @Override
  public Optional<ParticleFactory> loadParticle(String particleName) {
    return particleFactories.stream()
        .filter(x -> x.getParticleName().equals(particleName))
        .findFirst();
  }
}
