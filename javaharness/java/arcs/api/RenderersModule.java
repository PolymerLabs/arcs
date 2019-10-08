package arcs.api;

import dagger.Binds;
import dagger.Module;
import dagger.multibindings.Multibinds;
import java.util.Map;
import javax.inject.Singleton;

@Module
public abstract class RenderersModule {

  @Multibinds
  abstract Map<String, UiRenderer> provideRenderers();

  @Binds
  @Singleton
  public abstract UiBroker provideUiBroker(UiBrokerImpl impl);
}
