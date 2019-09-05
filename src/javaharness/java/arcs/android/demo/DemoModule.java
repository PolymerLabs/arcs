package arcs.android.demo;

import arcs.demo.services.AlertService;
import arcs.demo.services.ClipboardService;
import dagger.Binds;
import dagger.Module;

@Module
public abstract class DemoModule {

  @Binds
  public abstract ClipboardService provideClipboardSurface(AndroidClipboardService impl);

  @Binds
  public abstract AlertService provideAlertSurface(AndroidToastAlertService impl);
}
