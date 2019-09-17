package arcs.demo.particles;

import arcs.demo.services.ClipboardService;
import arcs.api.Particle;
import arcs.api.ParticleFactory;
import arcs.api.PortableJsonParser;
import javax.inject.Inject;

public class CaptureEntityFactory implements ParticleFactory {

  private PortableJsonParser parser;
  private ClipboardService clipboardService;

  // TODO: Inject interfaces particles normally may want in defineParticle (e.g. html, log, etc)
  @Inject
  public CaptureEntityFactory(PortableJsonParser parser, ClipboardService clipboardService) {
    this.parser = parser;
    this.clipboardService = clipboardService;
  }

  @Override
  public String getParticleName() {
    return "CaptureEntity";
  }

  @Override
  public Particle createParticle() {
    return new CaptureEntity(parser, clipboardService);
  }
}
