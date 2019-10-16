package arcs.android.demo;

import android.content.Context;

import javax.inject.Singleton;

import arcs.android.api.Annotations.AppContext;
import arcs.android.client.AndroidClientModule;
import dagger.BindsInstance;
import dagger.Component;

@Singleton
@Component(modules = {AndroidClientModule.class, AndroidDemoServiceModule.class})
public interface NotificationDemoActivityComponent {

  void inject(NotificationDemoActivity activity);

  @Component.Builder
  interface Builder {
    @BindsInstance
    NotificationDemoActivityComponent.Builder appContext(@AppContext Context appContext);

    NotificationDemoActivityComponent build();
  }
}
