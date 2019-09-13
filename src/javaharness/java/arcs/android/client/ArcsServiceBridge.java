package arcs.android.client;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;
import arcs.android.api.IArcsService;
import arcs.api.ArcsEnvironment;
import java.util.LinkedList;
import java.util.Queue;
import javax.inject.Inject;
import javax.inject.Named;

public class ArcsServiceBridge implements ArcsEnvironment, ServiceConnection {

  private Context context;
  private IArcsService arcsService; // Access via connectToArcsService.
  private Class arcsServiceClass;
  private Queue<String> messageQueue = new LinkedList<>();

  @Inject
  ArcsServiceBridge(
      @Named("AppContext") Context context, @Named("ArcsService") Class arcsServiceClass) {
    this.context = context;
    this.arcsServiceClass = arcsServiceClass;
  }

  private void connectToArcsService() {
    if (arcsService != null) {
      return;
    }

    Intent intent = new Intent(context, arcsServiceClass);
    context.bindService(intent, this, Context.BIND_AUTO_CREATE);
  }

  private void processQueue() {
    if (arcsService == null) {
      throw new IllegalStateException("Not connected to the ArcsService.");
    }

    for (String message; (message = messageQueue.poll()) != null;) {
      try {
        arcsService.sendMessageToArcs(message);
      } catch (RemoteException e) {
        throw new RuntimeException(e);
      }
    }
  }

  @Override
  public void sendMessageToArcs(String msg, DataListener listener) {
    if (listener != null) {
      // TODO: Add support for listeners.
      throw new UnsupportedOperationException(
          "listeners are not yet supported by the ArcsServiceBridge.");
    }

    messageQueue.add(msg);
    if (arcsService != null) {
      processQueue();
    } else {
      connectToArcsService();
    }
  }

  @Override
  public void onServiceConnected(ComponentName name, IBinder binder) {
    Log.d("Srv", "Service connected!");
    arcsService = IArcsService.Stub.asInterface(binder);
    Log.d("Srv", "Service interface [" + arcsService + "]");
    processQueue();
  }

  @Override
  public void onServiceDisconnected(ComponentName name) {
    Log.d("Srv", "Service disconnected!");
    arcsService = null;
  }
}
