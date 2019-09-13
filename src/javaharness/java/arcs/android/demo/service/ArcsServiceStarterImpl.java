package arcs.android.demo.service;

import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import arcs.android.api.Annotations.AppContext;
import arcs.android.client.ArcsServiceStarter;
import javax.inject.Inject;

public class ArcsServiceStarterImpl implements ArcsServiceStarter {

  private final Context context;

  @Inject
  ArcsServiceStarterImpl(@AppContext Context context) {
    this.context = context;
  }

  @Override
  public void start(ServiceConnection connection) {
    Intent intent = new Intent(context, ArcsService.class);
    context.bindService(intent, connection, Context.BIND_AUTO_CREATE);
  }
}
