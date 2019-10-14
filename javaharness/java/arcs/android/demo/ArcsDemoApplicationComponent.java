package arcs.android.demo;

import android.content.Context;

import javax.inject.Singleton;

import arcs.android.ArcsAndroidModule;
import dagger.BindsInstance;
import dagger.Component;

@Singleton
@Component(
  modules = {ArcsAndroidModule.class}
)
interface ArcsDemoApplicationComponent {

  void inject(AutofillDemoActivity activity);
  void inject(NotificationDemoActivity activity);
  void inject(ArcsAutofillService service);

  @Component.Builder
  interface Builder {
    @BindsInstance
    ArcsDemoApplicationComponent.Builder context(Context context);

    ArcsDemoApplicationComponent build();
  }
}
