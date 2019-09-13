package arcs.android.demo.service;

import android.content.Context;
import arcs.android.api.Annotations.AppContext;
import arcs.android.client.AndroidClientModule;
import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;

@Singleton
@Component(modules = {AndroidClientModule.class, ArcsServiceModule.class})
public interface ArcsAutofillServiceComponent {

  void inject(ArcsAutofillService arcsAutofillService);

  @Component.Builder
  interface Builder {
    @BindsInstance
    ArcsAutofillServiceComponent.Builder appContext(@AppContext Context appContext);

    ArcsAutofillServiceComponent build();
  }
}
