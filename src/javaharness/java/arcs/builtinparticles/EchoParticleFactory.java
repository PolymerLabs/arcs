package arcs.builtinparticles;

import arcs.api.Particle;
import arcs.api.ParticleFactory;
import javax.inject.Inject;

public class EchoParticleFactory implements ParticleFactory {
  // TODO: Inject interfaces particles normally may want in defineParticle (e.g. html, log, etc)
  @Inject
  public EchoParticleFactory(/* put requirements here */ ) {}

  @Override
  public String getParticleName() {
    return "EchoParticle";
  }

  @Override
  public Particle createParticle() {
    return new EchoParticle();
  }
}
