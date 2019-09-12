package arcs.android.client;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.util.Log;
import arcs.android.api.IArcsService;
import arcs.api.ArcsEnvironment;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import javax.inject.Named;

public class ArcsServiceBridge implements ArcsEnvironment {

  private Context context;
  private IArcsService arcsService; // Access via connectToArcsService.
  private Class arcsServiceClass;

  @Inject
  ArcsServiceBridge(@Named("AppContext") Context context, @Named("ArcsService") Class arcsServiceClass) {
    this.context = context;
    this.arcsServiceClass = arcsServiceClass;
  }

  private Future<IArcsService> connectToArcsService() {
    if (arcsService != null) {
      return CompletableFuture.completedFuture(arcsService);
    }

    CompletableFuture<IArcsService> future = new CompletableFuture<>();

    ServiceConnection serviceConnection =
        new ServiceConnection() {
          @Override
          public void onServiceConnected(ComponentName name, IBinder binder) {
            Log.d("Srv", "Service connected!");
            arcsService = IArcsService.Stub.asInterface(binder);
            future.complete(arcsService);
            Log.d("Srv", "Service interface [" + arcsService + "]");
          }

          @Override
          public void onServiceDisconnected(ComponentName name) {
            Log.d("Srv", "Service disconnected!");
            arcsService = null;
            if (!future.isDone()) {
              future.completeExceptionally(new Exception("Service disconnected"));
            }
          }
        };

    Intent intent = new Intent(context, arcsServiceClass);
    context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);

    return future;
  }

  @Override
  public void sendMessageToArcs(String msg, DataListener listener) {
    if (listener != null) {
      // TODO: Add support for listeners.
      throw new UnsupportedOperationException(
          "listeners are not yet supported by the ArcsServiceBridge.");
    }

    try {
      // Blocks until ArcsService is connected.
      connectToArcsService().get(2, TimeUnit.SECONDS).sendMessageToArcs(msg);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}
