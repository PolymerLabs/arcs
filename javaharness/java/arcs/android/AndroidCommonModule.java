package arcs.android;

import arcs.api.HandleFactory;
import arcs.api.HandleFactoryImpl;
import arcs.api.PortableJsonParser;
import dagger.Binds;
import dagger.Module;

/** Dagger module for classes common to all Android modules. */
@Module
public abstract class AndroidCommonModule {

  @Binds
  abstract PortableJsonParser providesPortableJsonParser(AndroidPortableJsonParser impl);

  @Binds
  public abstract HandleFactory providesHandleFactory(HandleFactoryImpl impl);
}
