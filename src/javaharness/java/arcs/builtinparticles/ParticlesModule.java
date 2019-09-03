package arcs.builtinparticles;

import arcs.api.ParticleFactory;
import dagger.Binds;
import dagger.Module;
import dagger.multibindings.IntoSet;
import dagger.multibindings.Multibinds;
import java.util.Set;

@Module
public abstract class ParticlesModule {

  @Multibinds
  abstract Set<ParticleFactory> provideParticleFactories();

  @Binds
  @IntoSet
  abstract ParticleFactory provideEchoParticleFactory(EchoParticleFactory echoParticleFactory);

  @Binds
  @IntoSet
  abstract ParticleFactory provideCaptureEntityFactory(CaptureEntityFactory captureEntityFactory);

  @Binds
  @IntoSet
  abstract ParticleFactory provideToastParticleFactory(ToastParticleFactory toastParticleFactory);
}
