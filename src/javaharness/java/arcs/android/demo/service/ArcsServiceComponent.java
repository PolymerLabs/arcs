package arcs.android.demo.service;

import android.content.Context;

import android.webkit.WebView;
import arcs.demo.ui.RenderersModule;
import javax.inject.Named;
import javax.inject.Singleton;

import arcs.android.impl.AndroidHarnessModule;
import arcs.demo.particles.ParticlesModule;
import dagger.BindsInstance;
import dagger.Component;

@Singleton
@Component(modules = {
    AndroidHarnessModule.class,
    ParticlesModule.class,
    RenderersModule.class,
    ArcsServiceModule.class})
public interface ArcsServiceComponent {

  void inject(ArcsService arcsService);

  @Component.Builder
  interface Builder {
    @BindsInstance
    Builder appContext(@Named("AppContext") Context appContext);

    @BindsInstance
    Builder webView(WebView webView);

    ArcsServiceComponent build();
  }
}
