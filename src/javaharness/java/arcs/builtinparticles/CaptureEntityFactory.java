package arcs.builtinparticles;

import arcs.api.Particle;
import arcs.api.ParticleFactory;

import javax.inject.Inject;

public class CaptureEntityFactory implements ParticleFactory {
    private final EntityObserver entityObserver;
    // TODO: Inject interfaces particles normally may want in defineParticle (e.g. html, log, etc)
    @Inject
    public CaptureEntityFactory(EntityObserver entityObserver/* put requirements here */) {
        this.entityObserver = entityObserver;
    }

    @Override
    public String getParticleName() {
        return "CaptureEntity";
    }

    @Override
    public Particle createParticle() {
        return new CaptureEntity(entityObserver);
    }
}
