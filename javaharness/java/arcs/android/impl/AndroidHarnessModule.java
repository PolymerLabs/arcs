package arcs.android.impl;

import arcs.api.RuntimeSettings;
import arcs.api.ShellApi;
import dagger.Binds;
import dagger.Module;
import javax.inject.Singleton;

/** Dagger module for the Android Harness (i.e. the main ArcsService). */
@Module(includes = AndroidCommonModule.class)
public abstract class AndroidHarnessModule {

  @Binds
  @Singleton
  abstract ShellApi providesWebShellApi(AndroidShellApi impl);

  @Binds
  public abstract RuntimeSettings providesRuntimeSettings(AndroidRuntimeSettings impl);
}
