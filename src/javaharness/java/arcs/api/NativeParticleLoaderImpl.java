package arcs.api;

import javax.inject.Inject;
import java.util.Optional;
import java.util.Set;

public class NativeParticleLoaderImpl implements NativeParticleLoader {
    private Set<NativeParticleFactory> nativeParticleFactories;

    @Inject
    public NativeParticleLoaderImpl(Set<NativeParticleFactory> nativeParticleFactories) {
        this.nativeParticleFactories = nativeParticleFactories;
    }

    @Override
    public Optional<NativeParticleFactory> loadParticle(String particleName) {
        return nativeParticleFactories.stream().filter(x -> x.getParticleName().equals(particleName))
                .findFirst();
    }
}
