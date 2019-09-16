package arcs.android.client;

import android.content.ComponentName;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import arcs.android.api.IArcsService;
import arcs.api.ArcsEnvironment;
import java.util.ArrayDeque;
import java.util.List;
import java.util.Queue;
import javax.inject.Inject;

public class ArcsServiceBridge implements ArcsEnvironment, ServiceConnection {

  private final ArcsServiceStarter arcsServiceStarter;
  private IArcsService arcsService; // Access via connectToArcsService.
  private Queue<String> messageQueue = new ArrayDeque<>();

  @Inject
  ArcsServiceBridge(ArcsServiceStarter arcsServiceStarter) {
    this.arcsServiceStarter = arcsServiceStarter;
  }

  private void connectToArcsService() {
    if (arcsService != null) {
      return;
    }
    arcsServiceStarter.start(this);
  }

  private void processQueue() {
    if (arcsService == null) {
      throw new IllegalStateException("Not connected to the ArcsService.");
    }

    for (String message; (message = messageQueue.poll()) != null; ) {
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
    arcsService = IArcsService.Stub.asInterface(binder);
    processQueue();
  }

  @Override
  public void onServiceDisconnected(ComponentName name) {
    arcsService = null;
  }

  // Unimplemented ArcsEnvironment methods

  @Override
  public void fireDataEvent(String tid, String data) {}

  @Override
  public void addReadyListener(ReadyListener listener) {}

  @Override
  public void fireReadyEvent(List<String> recipes) {}

  @Override
  public void init() {}

  @Override
  public void reset() {}

  @Override
  public void destroy() {}

  @Override
  public void show() {}

  @Override
  public void hide() {}
}
