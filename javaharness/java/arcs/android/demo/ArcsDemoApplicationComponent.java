package arcs.android.demo;

import android.content.Context;

import javax.inject.Singleton;

import arcs.android.AndroidClientModule;
import arcs.android.Annotations;
import dagger.BindsInstance;
import dagger.Component;

@Singleton
@Component(
  modules = {AndroidClientModule.class, AndroidDemoServiceModule.class}
)
interface ArcsDemoApplicationComponent {

  void inject(AutofillDemoActivity activity);
  void inject(NotificationDemoActivity activity);
  void inject(ArcsAutofillService service);
  void inject(AndroidNotificationHandlerService service);

  @Component.Builder
  interface Builder {
    @BindsInstance
    ArcsDemoApplicationComponent.Builder appContext(
      @Annotations.AppContext  Context context);

    ArcsDemoApplicationComponent build();
  }
}
