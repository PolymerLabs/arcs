package arcs.android.demo.service;

import arcs.android.client.ArcsServiceStarter;
import arcs.demo.services.AlertService;
import arcs.demo.services.ClipboardService;
import dagger.Binds;
import dagger.Module;

@Module
public abstract class ArcsServiceModule {

  @Binds
  public abstract ClipboardService provideClipboardSurface(AndroidClipboardService impl);

  @Binds
  public abstract AlertService provideAlertSurface(AndroidToastAlertService impl);

  @Binds
  public abstract ArcsServiceStarter provideArcsServiceStarter(ArcsServiceStarterImpl impl);
}
