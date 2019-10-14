package arcs.android;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import javax.inject.Singleton;

import arcs.api.Arcs;
import arcs.api.ArcsEnvironment;
import arcs.api.ParticleLoader;
import arcs.api.RuntimeSettings;
import arcs.api.ShellApi;
import dagger.Binds;
import dagger.Module;
import dagger.Provides;

@Module
public abstract class ArcsAndroidModule {

  @Singleton
  @Binds
  public abstract ArcsEnvironment provideArcsEnvironment(
      AndroidArcsEnvironment impl);

  @Singleton
  @Binds
  public abstract ParticleLoader provideParticleLoader(
    AndroidParticleLoader particleLoader);

  @Singleton
  @Binds
  public abstract ShellApi provideShellApi(
    AndroidShellApi androidShellApi);

  @Singleton
  @Binds
  public abstract Arcs provideArcs(
    ArcsAndroid android);

  @Singleton
  @Binds
  public abstract RuntimeSettings providesRuntimeSettings(RuntimeSettingsAndroidJsImpl impl);

  @Singleton
  @Provides
  public static Executor provideExecutor() {
    return Executors.newSingleThreadExecutor();
  }
}
