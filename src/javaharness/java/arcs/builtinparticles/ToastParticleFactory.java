package arcs.builtinparticles;

import arcs.api.AlertSurface;
import arcs.api.Particle;
import arcs.api.ParticleFactory;
import arcs.api.PortableJsonParser;
import javax.inject.Inject;

public class ToastParticleFactory implements ParticleFactory {

  private AlertSurface alertSurface;

  // TODO: Inject interfaces particles normally may want in defineParticle (e.g. html, log, etc)
  @Inject
  public ToastParticleFactory(AlertSurface alertSurface) {
    //    this.entityObserver = entityObserver;
    this.alertSurface = alertSurface;
  }

  @Override
  public String getParticleName() {
    return "ToastParticle";
  }

  @Override
  public Particle createParticle() {
    return new ToastParticle(alertSurface);
  }
}
