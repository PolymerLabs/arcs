package arcs.android;

import arcs.api.Arcs;
import arcs.api.RuntimeSettings;
import dagger.Binds;
import dagger.Module;

/** Dagger module for the Android Harness (i.e. the main ArcsService). */
@Module(includes = AndroidCommonModule.class)
public abstract class AndroidHarnessModule {

  @Binds
  public abstract Arcs provideArcs(ArcsLocal impl);

  @Binds
  public abstract RuntimeSettings providesRuntimeSettings(AndroidRuntimeSettings impl);
}
