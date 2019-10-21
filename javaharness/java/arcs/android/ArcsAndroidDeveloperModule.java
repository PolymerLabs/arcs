package arcs.android;

import dagger.Binds;
import dagger.Module;

@Module
public abstract class ArcsAndroidDeveloperModule {

  @Binds
  abstract AndroidArcsEnvironment providesWebViewAndroidArcsEnvironment(
      AndroidWebViewArcsEnvironment androidWebViewArcsEnvironment);
}
