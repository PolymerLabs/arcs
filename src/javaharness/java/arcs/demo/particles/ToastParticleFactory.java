package arcs.demo.particles;

import arcs.demo.services.AlertService;
import arcs.api.Particle;
import arcs.api.ParticleFactory;
import javax.inject.Inject;

public class ToastParticleFactory implements ParticleFactory {

  private AlertService alertSurface;

  // TODO: Inject interfaces particles normally may want in defineParticle (e.g. html, log, etc)
  @Inject
  public ToastParticleFactory(AlertService alertService) {
    this.alertSurface = alertService;
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
