package arcs.api;

import javax.inject.Inject;
import java.util.Optional;
import java.util.Set;

public class ParticleExecutionContextImpl implements ParticleExecutionContext {
    private NativeParticleLoader particleLoader;

    @Inject
    public ParticleExecutionContextImpl(NativeParticleLoader particleLoader) {
        this.particleLoader = particleLoader;
    }

    @Override
    public NativeParticle instantiateParticle(String name) {
        return particleLoader.loadParticle(name).flatMap(x -> Optional.of(x.createParticle()))
                .orElse(null);
    }
}
