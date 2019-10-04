package arcs.api;

import arcs.api.UiBroker;
import arcs.api.UiBrokerImpl;
import arcs.api.UiRenderer;
import dagger.Binds;
import dagger.Module;
import dagger.Provides;
import dagger.multibindings.IntoMap;
import dagger.multibindings.IntoSet;
import dagger.multibindings.Multibinds;
import dagger.multibindings.StringKey;
import java.util.Map;
import java.util.Set;
import javax.inject.Singleton;

@Module
public abstract class RenderersModule {

  @Multibinds
  abstract Map<String, UiRenderer> provideRenderers();

  @Binds
  @Singleton
  public abstract UiBroker provideUiBroker(UiBrokerImpl impl);
}
