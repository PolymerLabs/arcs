package arcs.android.demo.service;

import arcs.demo.services.AlertService;
import arcs.demo.services.ClipboardService;
import dagger.Binds;
import dagger.Module;
import dagger.Provides;
import javax.inject.Named;

@Module
public abstract class ArcsServiceModule {

  @Binds
  public abstract ClipboardService provideClipboardSurface(AndroidClipboardService impl);

  @Binds
  public abstract AlertService provideAlertSurface(AndroidToastAlertService impl);

  @Provides
  @Named("ArcsService")
  public static Class arcsServiceClass() {
    return ArcsService.class;
  }
}
