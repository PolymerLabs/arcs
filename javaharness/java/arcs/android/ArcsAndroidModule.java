package arcs.android;

import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import javax.inject.Singleton;

import arcs.api.RuntimeSettings;
import dagger.Binds;
import dagger.Module;

@Module
public abstract class ArcsAndroidModule {

  @Singleton
  @Binds
  public abstract RuntimeSettings providesRuntimeSettings(
    AndroidRuntimeSettings impl);

  @Binds
  abstract PortableJson providesPortableJson(
      AndroidPortableJson androidPortableJson);

  @Binds
  abstract PortableJsonParser providesPortableJsonParser(
      AndroidPortableJsonParser androidPortableJsonParser);
}
