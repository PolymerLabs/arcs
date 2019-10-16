package arcs.android.demo;

import android.content.Context;
import arcs.android.api.Annotations.AppContext;
import arcs.android.client.AndroidClientModule;
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
