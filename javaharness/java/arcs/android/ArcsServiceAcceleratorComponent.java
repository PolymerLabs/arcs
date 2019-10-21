package arcs.android;

import dagger.Component;
import javax.inject.Singleton;

@Singleton
@Component(modules = {ArcsAndroidModule.class, ArcsAndroidAcceleratorModule.class})
interface ArcsServiceAcceleratorComponent {

  void inject(ArcsService arcsService);

  @Component.Builder
  interface Builder {
    ArcsServiceAcceleratorComponent build();
  }
}
