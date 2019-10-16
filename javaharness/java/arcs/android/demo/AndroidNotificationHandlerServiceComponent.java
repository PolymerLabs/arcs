package arcs.android.demo;

import android.content.Context;
import arcs.android.Annotations.AppContext;
import arcs.android.AndroidClientModule;
import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;

@Singleton
@Component(modules = {AndroidClientModule.class, AndroidDemoServiceModule.class})
public interface AndroidNotificationHandlerServiceComponent {

  void inject(AndroidNotificationHandlerService service);

  @Component.Builder
  interface Builder {
    @BindsInstance
    AndroidNotificationHandlerServiceComponent.Builder appContext(@AppContext Context appContext);

    AndroidNotificationHandlerServiceComponent build();
  }
}
