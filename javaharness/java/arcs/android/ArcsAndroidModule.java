package arcs.android;

import javax.inject.Singleton;

import arcs.api.Arcs;
import arcs.api.ArcsEnvironment;
import arcs.api.ParticleLoader;
import arcs.api.PecPortManager;
import arcs.api.RuntimeSettings;
import arcs.api.ShellApi;
import arcs.api.UiBroker;
import dagger.Binds;
import dagger.Module;

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
  public abstract UiBroker provideUiBroker(
    AndroidUiBroker androidUiBroker);

  @Singleton
  @Binds
  public abstract PecPortManager providePecPortManager(
    AndroidPecPortManager androidPecPortManager);

  @Singleton
  @Binds
  public abstract Arcs provideArcs(
    ArcsAndroid android);

  @Singleton
  @Binds
  public abstract RuntimeSettings providesRuntimeSettings(
    AndroidRuntimeSettings impl);
}
