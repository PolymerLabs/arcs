package arcs.android.demo.ui;

import android.content.Context;
import arcs.android.api.Annotations.AppContext;
import arcs.android.client.AndroidClientModule;
import arcs.android.demo.service.ArcsServiceModule;
import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;

@Singleton
@Component(modules = {AndroidClientModule.class, ArcsServiceModule.class})
public interface NotificationDemoActivityComponent {

  void inject(NotificationDemoActivity activity);

  @Component.Builder
  interface Builder {
    @BindsInstance
    NotificationDemoActivityComponent.Builder appContext(@AppContext Context appContext);

    NotificationDemoActivityComponent build();
  }
}
