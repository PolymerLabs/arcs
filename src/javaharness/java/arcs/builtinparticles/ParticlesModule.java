package arcs.builtinparticles;

import arcs.api.ArcsApi;
import arcs.api.ArcsApiImpl;
import arcs.api.ParticleFactory;
import dagger.Binds;
import dagger.Module;
import dagger.Provides;
import dagger.multibindings.IntoSet;
import dagger.multibindings.Multibinds;
import dagger.Module;

import java.util.Set;
import javax.inject.Singleton;

@Module
public abstract class ParticlesModule {
  @Binds
  @Singleton
  public abstract ArcsApi provideArcsApi(ArcsApiImpl impl);

  @Multibinds
  abstract Set<ParticleFactory> provideParticleFactories();

  @Provides
  @IntoSet
  static ParticleFactory provideEchoParticleFactory(EchoParticleFactory echoParticleFactory) {
      return echoParticleFactory;
  }

  @Provides
  @IntoSet
  static ParticleFactory provideRecognizeEntityFactory(RecognizeEntityFactory recognizeEntityFactory) {
    return recognizeEntityFactory;
  }
}
