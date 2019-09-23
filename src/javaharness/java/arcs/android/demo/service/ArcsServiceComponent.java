package arcs.android.demo.service;

import android.content.Context;
import android.webkit.WebView;
import arcs.android.api.Annotations.AppContext;
import arcs.android.impl.AndroidHarnessModule;
import arcs.demo.particles.ParticlesModule;
import arcs.demo.ui.RenderersModule;
import dagger.BindsInstance;
import dagger.Component;
import javax.inject.Singleton;

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
    Builder appContext(@AppContext Context appContext);

    @BindsInstance
    Builder webView(WebView webView);

    ArcsServiceComponent build();
  }
}
