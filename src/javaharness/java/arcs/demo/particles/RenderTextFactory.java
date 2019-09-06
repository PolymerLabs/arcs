package arcs.demo.particles;

import arcs.demo.services.ClipboardService;
import arcs.api.Particle;
import arcs.api.ParticleFactory;
import arcs.api.PortableJsonParser;
import javax.inject.Inject;

public class RenderTextFactory implements ParticleFactory {

  private PortableJsonParser parser;

  // TODO: Inject interfaces particles normally may want in defineParticle (e.g. html, log, etc)
  @Inject
  public RenderTextFactory(PortableJsonParser parser) {
    this.parser = parser;
  }

  @Override
  public String getParticleName() {
    return "RenderText";
  }

  @Override
  public Particle createParticle() {
    return new RenderText(parser);
  }
}
