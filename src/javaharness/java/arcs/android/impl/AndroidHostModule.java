package arcs.android.impl;

import arcs.api.ArcsEnvironment;
import arcs.api.ArcsEnvironment.DataListener;
import arcs.api.DeviceClient;
import arcs.api.HandleFactory;
import arcs.api.HandleFactoryImpl;
import arcs.api.HarnessController;
import arcs.api.PECInnerPortFactory;
import arcs.api.PECInnerPortFactoryImpl;
import arcs.api.ParticleExecutionContext;
import arcs.api.ParticleExecutionContextImpl;
import arcs.api.ParticleLoader;
import arcs.api.ParticleLoaderImpl;
import arcs.api.PortablePromiseFactory;
import arcs.api.ShellApi;
import arcs.api.ShellApiBasedArcsEnvironment;
import dagger.Binds;
import dagger.Module;
import dagger.Provides;
import java.util.HashMap;
import java.util.Map;
import javax.inject.Singleton;

@Module(includes = AndroidCommonModule.class)
public abstract class AndroidHostModule {

  @Binds
  public abstract ArcsEnvironment provideStandaloneWebArcsEnvironment(
      ShellApiBasedArcsEnvironment impl);

  @Singleton
  @Provides
  public static Map<String, DataListener> provideInProgressListeners() {
    return new HashMap<>();
  }

  @Singleton
  @Binds
  public abstract DeviceClient provideAndroidDeviceClient(DeviceClientAndroidImpl impl);

  @Binds
  @Singleton
  abstract ShellApi providesWebShellApi(AndroidShellApiImpl impl);

  @Binds
  public abstract HarnessController providesHarnessController(AndroidHarnessController impl);

  @Binds
  abstract ParticleExecutionContext providesParticleExecutionContext(
      ParticleExecutionContextImpl impl);

  @Binds
  abstract ParticleLoader providesParticleLoader(ParticleLoaderImpl impl);

  @Binds
  public abstract PECInnerPortFactory providesPECInnerPortFactory(PECInnerPortFactoryImpl impl);

  @Binds
  public abstract HandleFactory providesHandleFactory(HandleFactoryImpl impl);

  @Binds
  public abstract PortablePromiseFactory providesPortablePromiseFactory(
      PortablePromiseFactoryAndroidImpl impl);
}
