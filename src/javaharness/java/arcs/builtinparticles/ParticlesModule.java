package arcs.builtinparticles;

import arcs.api.ParticleFactory;
import dagger.Provides;
import dagger.multibindings.IntoSet;
import dagger.multibindings.Multibinds;
import dagger.Module;

import java.util.Set;

@Module
public abstract class ParticlesModule {

  @Multibinds
  abstract Set<ParticleFactory> provideParticleFactories();

  @Provides
  @IntoSet
  static ParticleFactory provideEchoParticleFactory(EchoParticleFactory echoParticleFactory) {
      return echoParticleFactory;
  }
}
