package arcs.android.client;

import arcs.api.ArcsEnvironment;
import dagger.Binds;
import dagger.Module;

@Module
public abstract class AndroidClientModule {

  @Binds
  abstract ArcsEnvironment provideArcsEnvironment(ArcsServiceBridge arcsServiceBridge);
}
