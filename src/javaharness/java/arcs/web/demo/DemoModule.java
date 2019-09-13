package arcs.web.demo;

import arcs.demo.services.AlertService;
import arcs.demo.services.ClipboardService;
import dagger.Binds;
import dagger.Module;

@Module
public abstract class DemoModule {

  // @Binds
  // public abstract ClipboardService provideClipboardSurface(WebClipboardService impl);

  @Binds
  public abstract AlertService provideAlertSurface(WebAlertService impl);
}
