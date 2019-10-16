package arcs.android.demo;

import android.content.Context;

import javax.inject.Singleton;

import arcs.android.Annotations.AppContext;
import arcs.android.AndroidClientModule;
import dagger.BindsInstance;
import dagger.Component;

@Singleton
@Component(modules = {AndroidClientModule.class, AndroidDemoServiceModule.class})
public interface ArcsAutofillServiceComponent {

  void inject(ArcsAutofillService arcsAutofillService);

  @Component.Builder
  interface Builder {
    @BindsInstance
    ArcsAutofillServiceComponent.Builder appContext(@AppContext Context appContext);

    ArcsAutofillServiceComponent build();
  }
}
