package arcs.android;

import javax.inject.Singleton;

import dagger.Component;

@Singleton
@Component(modules = {ArcsAndroidModule.class, ArcsAndroidDeveloperModule.class})
interface ArcsServiceComponent {

  void inject(ArcsService arcsService);

  @Component.Builder
  interface Builder {
    ArcsServiceComponent build();
  }
}
