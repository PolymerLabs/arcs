package arcs.nativeparticles;

import arcs.api.NativeParticleFactory;
import dagger.Module;
import dagger.Provides;
import dagger.multibindings.IntoSet;
import dagger.multibindings.Multibinds;

import java.util.Set;

@Module
public abstract class NativeParticlesModule {

    @Multibinds
    abstract Set<NativeParticleFactory> provideNativeParticleFactories();

    @Provides
    @IntoSet
    static NativeParticleFactory provideEchoParticleFactory(EchoParticleFactory echoParticleFactory) {
        return new EchoParticleFactory();
    }
}
