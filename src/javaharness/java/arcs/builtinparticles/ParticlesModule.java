package arcs.builtinparticles;

import arcs.api.ParticleFactory;
import dagger.Module;
import dagger.Provides;
import dagger.multibindings.IntoSet;
import dagger.multibindings.Multibinds;
import java.util.Set;
import javax.inject.Singleton;

@Module
public abstract class ParticlesModule {
  @Multibinds
  abstract Set<ParticleFactory> provideParticleFactories();

  @Provides
  @IntoSet
  static ParticleFactory provideEchoParticleFactory(EchoParticleFactory echoParticleFactory) {
    return echoParticleFactory;
  }

  @Provides
  @IntoSet
  static ParticleFactory provideCaptureEntityFactory(CaptureEntityFactory captureEntityFactory) {
    return captureEntityFactory;
  }
}
