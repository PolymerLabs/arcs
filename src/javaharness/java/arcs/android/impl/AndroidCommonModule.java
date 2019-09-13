package arcs.android.impl;

import arcs.api.PortableJsonParser;
import dagger.Binds;
import dagger.Module;

@Module
public abstract class AndroidCommonModule {

  @Binds
  abstract PortableJsonParser providesPortableJsonParser(PortableJsonParserAndroidImpl impl);
}
