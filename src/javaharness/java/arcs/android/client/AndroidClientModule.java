package arcs.android.client;

import arcs.android.impl.AndroidCommonModule;
import arcs.api.ArcsEnvironment;
import arcs.api.ParticleFactory;
import dagger.Binds;
import dagger.Module;
import dagger.Provides;
import java.util.HashSet;
import java.util.Set;
import javax.inject.Singleton;

/** Dagger module for client code (running in a service separate to the main ArcsService). */
@Module(includes = AndroidCommonModule.class)
public abstract class AndroidClientModule {

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
}
