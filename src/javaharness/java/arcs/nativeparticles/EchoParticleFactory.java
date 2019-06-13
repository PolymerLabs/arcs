package arcs.nativeparticles;

import arcs.api.NativeParticle;
import arcs.api.NativeParticleFactory;

import javax.inject.Inject;

public class EchoParticleFactory implements NativeParticleFactory {
    // TODO: Inject interfaces particles normally may want in defineParticle (e.g. html, log, etc)
    @Inject
    public EchoParticleFactory(/* put requirements here */) {
    }

    @Override
    public String getParticleName() {
        return "EchoParticle";
    }

    @Override
    public NativeParticle createParticle() {
        return new EchoParticle();
    }
}
