package arcs.android.client;

import arcs.android.impl.AndroidCommonModule;
import arcs.api.ArcsEnvironment;
import dagger.Binds;
import dagger.Module;

@Module(includes = AndroidCommonModule.class)
public abstract class AndroidClientModule {

  @Binds
  abstract ArcsEnvironment provideArcsEnvironment(ArcsServiceBridge arcsServiceBridge);
}
