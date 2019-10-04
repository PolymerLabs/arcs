package arcs.demo.ui;

import arcs.api.UiRenderer;
import dagger.Module;
import dagger.Provides;
import dagger.multibindings.IntoMap;
import dagger.multibindings.StringKey;

@Module
public abstract class DemoRenderersModule {

  @Provides
  @IntoMap
  @StringKey("log")
  static UiRenderer provideLogRenderer(LogRenderer logRenderer) {
    return logRenderer;
  }

  @Provides
  @IntoMap
  @StringKey("alert")
  static UiRenderer provideAlertRenderer(AlertRenderer alertRenderer) {
    return alertRenderer;
  }
}
