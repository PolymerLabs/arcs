package arcs.sdk.android.dev.service.demo;

import android.content.Context;

import javax.inject.Singleton;

import dagger.BindsInstance;
import dagger.Component;

import arcs.sdk.android.dev.service.ArcsAndroidModule;

@Singleton
@Component(
  modules = {ArcsAndroidModule.class}
)
interface ArcsDemoApplicationComponent {

  void inject(AutofillDemoActivity activity);
  void inject(NotificationDemoActivity activity);
  void inject(ArcsAutofillService service);
  void inject(AndroidNotificationHandlerService service);

  @Component.Builder
  interface Builder {
    @BindsInstance
    ArcsDemoApplicationComponent.Builder context(Context context);

    ArcsDemoApplicationComponent build();
  }
}
