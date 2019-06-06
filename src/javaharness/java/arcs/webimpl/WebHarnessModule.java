package arcs.webimpl;

import arcs.api.*;
import dagger.Binds;
import dagger.Module;
import dagger.Provides;

import java.util.HashMap;
import java.util.Map;

@Module
public abstract class WebHarnessModule {

  @Binds
  public abstract ArcsEnvironment provideStandaloneWebArcsEnvironment(ShellApiBasedArcsEnvironment impl);

  @Provides
  public static Map<String, ArcsEnvironment.SuggestionListener> provideInProgressListeners() {
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
}
