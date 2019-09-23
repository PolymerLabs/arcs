package arcs.demo.particles;

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

  @Provides
  @IntoSet
  static ParticleFactory provideToastParticleFactory(ToastParticleFactory toastParticleFactory) {
    return toastParticleFactory;
  }

  @Provides
  @IntoSet
  static ParticleFactory provideRenderTextFactory(RenderTextFactory renderTextFactory) {
    return renderTextFactory;
  }
}
