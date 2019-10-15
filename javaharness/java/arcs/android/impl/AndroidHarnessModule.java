package arcs.android.impl;

import arcs.api.Arcs;
import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClient;
import arcs.api.HarnessController;
import arcs.api.RuntimeSettings;
import arcs.api.ShellApi;
import arcs.api.ShellApiBasedArcsEnvironment;
import dagger.Binds;
import dagger.Module;
import javax.inject.Singleton;

/** Dagger module for the Android Harness (i.e. the main ArcsService). */
@Module(includes = AndroidCommonModule.class)
public abstract class AndroidHarnessModule {

  @Binds
  public abstract Arcs provideArcs(ArcsLocal impl);

  @Binds
  @Singleton
  public abstract ArcsEnvironment provideStandaloneWebArcsEnvironment(
      ShellApiBasedArcsEnvironment impl);

  @Singleton
  @Binds
  public abstract DeviceClient provideAndroidDeviceClient(AndroidDeviceClient impl);

  @Binds
  @Singleton
  abstract ShellApi providesWebShellApi(AndroidShellApiImpl impl);

  @Binds
  public abstract HarnessController providesHarnessController(AndroidHarnessController impl);

  @Binds
  public abstract RuntimeSettings providesRuntimeSettings(AndroidRuntimeSettings impl);
}
