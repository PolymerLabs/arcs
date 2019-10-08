package arcs.api;

import dagger.Module;
import dagger.multibindings.Multibinds;
import java.util.Set;

@Module
public abstract class ParticlesModule {

  @Multibinds
  abstract Set<ParticleFactory> provideParticleFactories();
}
