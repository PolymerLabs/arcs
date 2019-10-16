package arcs.android;

import java.util.HashSet;
import java.util.Set;

import javax.inject.Singleton;

import arcs.api.Arcs;
import arcs.api.ArcsEnvironment;
import arcs.api.ParticleFactory;
import arcs.api.UiBroker;
import dagger.Binds;
import dagger.Module;
import dagger.Provides;

/** Dagger module for client code (running in a service separate to the main ArcsService). */
@Module(includes = AndroidCommonModule.class)
public abstract class AndroidClientModule {

  @Binds
  public abstract Arcs providesArcs(ArcsAndroid impl);

  // Bind the ArcsServiceBridge to the ArcsEnvironment, so that all of the PEC code communicates
  // via the service bridge (instead of trying to talk directly to JS).
  @Binds
  abstract ArcsEnvironment provideArcsEnvironment(ArcsServiceBridge arcsServiceBridge);

  // TODO(csilvestrini): Figure out a nicer way of providing ParticleFactory instances for remote
  // PECs.
  @Provides
  @Singleton
  static Set<ParticleFactory> provideParticleFactories() {
    return new HashSet<>();
  }

  @Binds
  @Singleton
  public abstract UiBroker provideUiBroker(AndroidUiBroker impl);

  @Binds
  public abstract ArcsServiceStarter provideArcsServiceStarter(ArcsServiceStarterImpl impl);
}
