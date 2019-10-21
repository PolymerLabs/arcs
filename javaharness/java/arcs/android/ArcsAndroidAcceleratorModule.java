package arcs.android;

import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.RuntimeSettings;
import dagger.Binds;
import dagger.Module;
import javax.inject.Singleton;

@Module
public abstract class ArcsAndroidAcceleratorModule {
  @Binds
  abstract AndroidArcsEnvironment providesAcceleratorAndroidArcsEnvironment(
      ArcsAndroidAcceleratorEnvironment arcsAndroidAcceleratorEnvironment);
}
