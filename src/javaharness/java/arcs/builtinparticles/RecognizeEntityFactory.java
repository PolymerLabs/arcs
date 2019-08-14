package arcs.builtinparticles;

import arcs.api.ArcsApi;
import arcs.api.Particle;
import arcs.api.ParticleFactory;

import javax.inject.Inject;

 public class RecognizeEntityFactory implements ParticleFactory {
  private ArcsApi arcsApi;

  // TODO: Inject interfaces particles normally may want in defineParticle (e.g. html, log, etc)
  @Inject
  public RecognizeEntityFactory(ArcsApi arcsApi /* put requirements here */) {
    this.arcsApi = arcsApi;
  }

  @Override
  public String getParticleName() {
      return "RecognizeEntity";
  }

  @Override
  public Particle createParticle() {
      RecognizeEntity particle = new RecognizeEntity();
      arcsApi.registerHandler("ingestEntity", particle);
      return particle;
  }
}
