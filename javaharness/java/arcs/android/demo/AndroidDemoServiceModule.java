package arcs.android.demo;

import arcs.api.UiRenderer;
import dagger.Module;
import dagger.Provides;
import dagger.multibindings.IntoMap;
import dagger.multibindings.StringKey;

@Module
public abstract class AndroidDemoServiceModule {

  @Provides
  @IntoMap
  @StringKey("notification")
  static UiRenderer provideNotificationRenderer(NotificationRenderer notificationRenderer) {
    return notificationRenderer;
  }

  @Provides
  @IntoMap
  @StringKey("autofill")
  static UiRenderer provideAutofillRenderer(AutofillRenderer autofillRenderer) {
    return autofillRenderer;
  }
}
