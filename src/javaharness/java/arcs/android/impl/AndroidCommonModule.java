package arcs.android.impl;

import arcs.api.HandleFactory;
import arcs.api.HandleFactoryImpl;
import arcs.api.PECInnerPortFactory;
import arcs.api.PECInnerPortFactoryImpl;
import arcs.api.ParticleExecutionContext;
import arcs.api.ParticleExecutionContextImpl;
import arcs.api.ParticleLoader;
import arcs.api.ParticleLoaderImpl;
import arcs.api.PortableJsonParser;
import arcs.api.PortablePromiseFactory;
import dagger.Binds;
import dagger.Module;

/** Dagger module for classes common to all Android modules. */
@Module
public abstract class AndroidCommonModule {

  @Binds
  abstract PortableJsonParser providesPortableJsonParser(PortableJsonParserAndroidImpl impl);

  @Binds
  public abstract PECInnerPortFactory providesPECInnerPortFactory(PECInnerPortFactoryImpl impl);

  @Binds
  public abstract PortablePromiseFactory providesPortablePromiseFactory(
      PortablePromiseFactoryAndroidImpl impl);

  // TODO(csilvestrini): The dependencies below shouldn't be in the common module, they should only
  // be in the main Harness module.

  @Binds
  abstract ParticleExecutionContext providesParticleExecutionContext(
      ParticleExecutionContextImpl impl);

  @Binds
  abstract ParticleLoader providesParticleLoader(ParticleLoaderImpl impl);

  @Binds
  public abstract HandleFactory providesHandleFactory(HandleFactoryImpl impl);
}
