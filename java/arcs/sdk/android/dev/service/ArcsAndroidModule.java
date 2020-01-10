package arcs.sdk.android.dev.service;

import arcs.sdk.android.dev.api.PortableJson;
import arcs.sdk.android.dev.api.PortableJsonParser;
import arcs.sdk.android.dev.api.RuntimeSettings;

import javax.inject.Singleton;

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
