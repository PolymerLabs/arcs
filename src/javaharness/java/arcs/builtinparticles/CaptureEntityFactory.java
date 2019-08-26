package arcs.builtinparticles;

import arcs.api.AlertSurface;
import arcs.api.ClipboardSurface;
import arcs.api.Particle;
import arcs.api.ParticleFactory;

import arcs.api.PortableJsonParser;
import javax.inject.Inject;

public class CaptureEntityFactory implements ParticleFactory {

  private PortableJsonParser parser;
  private ClipboardSurface clipboardSurface;
  private AlertSurface alertSurface;

  //  private final EntityObserver entityObserver;
  // TODO: Inject interfaces particles normally may want in defineParticle (e.g. html, log, etc)
  @Inject
  public CaptureEntityFactory(PortableJsonParser parser, ClipboardSurface clipboardSurface) {
//    this.entityObserver = entityObserver;
    this.parser = parser;
    this.clipboardSurface = clipboardSurface;
  }

  @Override
  public String getParticleName() {
    return "CaptureEntity";
  }

  @Override
  public Particle createParticle() {
    return new CaptureEntity(parser /*entityObserver*/, clipboardSurface);
  }
}
