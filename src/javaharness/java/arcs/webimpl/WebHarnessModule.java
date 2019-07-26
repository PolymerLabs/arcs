package arcs.webimpl;

import arcs.api.*;
import dagger.Binds;
import dagger.Module;
import dagger.Provides;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Singleton;

@Module
public abstract class WebHarnessModule {

  @Binds
  public abstract ArcsEnvironment provideStandaloneWebArcsEnvironment(ShellApiBasedArcsEnvironment impl);

  @Singleton
  @Provides
  public static Map<String, ArcsEnvironment.DataListener> provideInProgressListeners() {
    return new HashMap<>();
  }

  @Binds
  public abstract DeviceClient provideWebDeviceClient(DeviceClientJsImpl impl);

  @Binds abstract ShellApi providesWebShellApi(ShellApiImpl impl);

  @Binds abstract PortableJsonParser providesPortableJsonParser(PortableJsonParserImpl impl);

  @Binds
  public abstract HarnessController providesHarnessController(WebHarnessController impl);

  @Binds
  abstract ParticleExecutionContext providesParticleExecutionContext(ParticleExecutionContextImpl impl);

  @Binds
  abstract NativeParticleLoader providesNativeParticleLoader(NativeParticleLoaderImpl impl);

  @Binds
  public abstract PECInnerPortFactory providesPECInnerPortFactory(PECInnerPortFactoryImpl impl);

  @Binds
  public abstract HandleFactory providesHandleFactory(HandleFactoryImpl impl);

  @Binds
  public abstract PortablePromiseFactory providesPortablePromiseFactory(PortablePromiseFactoryImpl impl);
}
