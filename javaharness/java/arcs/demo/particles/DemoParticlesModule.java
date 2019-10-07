package arcs.demo.particles;

import arcs.api.ParticleFactory;
import dagger.Module;
import dagger.Provides;
import dagger.multibindings.IntoSet;

@Module
public abstract class DemoParticlesModule {

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
