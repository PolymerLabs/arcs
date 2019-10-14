package arcs.android;

import javax.inject.Inject;

import arcs.api.Particle;
import arcs.api.ParticleLoader;

final class AndroidParticleLoader implements ParticleLoader {

  @Inject
  AndroidParticleLoader() {}

  @Override
  public Particle loadParticle(String particleName) {
    return null;
  }
}
