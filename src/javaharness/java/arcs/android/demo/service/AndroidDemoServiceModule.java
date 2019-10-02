package arcs.android.demo.service;

import arcs.api.UiRenderer;
import arcs.demo.services.AlertService;
import arcs.demo.services.ClipboardService;
import dagger.Binds;
import dagger.Module;
import dagger.Provides;
import dagger.multibindings.IntoMap;
import dagger.multibindings.StringKey;

@Module
public abstract class AndroidDemoServiceModule {

  @Binds
  public abstract ClipboardService provideClipboardSurface(AndroidClipboardService impl);

  @Binds
  public abstract AlertService provideAlertSurface(AndroidToastAlertService impl);

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
