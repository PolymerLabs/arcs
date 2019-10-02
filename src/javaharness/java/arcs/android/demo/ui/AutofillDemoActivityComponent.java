package arcs.android.demo.ui;

import android.content.Context;

import javax.inject.Singleton;

import arcs.android.api.Annotations.AppContext;
import arcs.android.client.AndroidClientModule;
import arcs.android.demo.service.AndroidDemoServiceModule;
import dagger.BindsInstance;
import dagger.Component;

@Singleton
@Component(modules = {AndroidClientModule.class, AndroidDemoServiceModule.class})
public interface AutofillDemoActivityComponent {

  void inject(AutofillDemoActivity autofillDemoActivity);

  @Component.Builder
  interface Builder {
    @BindsInstance
    AutofillDemoActivityComponent.Builder appContext(@AppContext Context appContext);

    AutofillDemoActivityComponent build();
  }
}
