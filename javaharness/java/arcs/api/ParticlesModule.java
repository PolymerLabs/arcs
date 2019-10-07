package arcs.api;

import arcs.api.ParticleFactory;
import dagger.Module;
import dagger.Provides;
import dagger.multibindings.IntoSet;
import dagger.multibindings.Multibinds;
import java.util.Set;

@Module
public abstract class ParticlesModule {

  @Multibinds
  abstract Set<ParticleFactory> provideParticleFactories();
}
