package arcs.android.client;

import android.content.ComponentName;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import arcs.android.api.IArcsService;
import arcs.api.ArcsEnvironment;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import javax.inject.Inject;

public class ArcsServiceBridge implements ArcsEnvironment, ServiceConnection {

  private final ArcsServiceStarter arcsServiceStarter;
  private IArcsService arcsService; // Access via connectToArcsService.
  private Queue<String> messageQueue = new ArrayDeque<>();
  private List<CompletableFuture<IArcsService>> waitingFutures = new ArrayList<>();

  @Inject
  ArcsServiceBridge(ArcsServiceStarter arcsServiceStarter) {
    this.arcsServiceStarter = arcsServiceStarter;
  }

  public IArcsService connectToArcsServiceSync() {
    if (arcsService != null) {
      return arcsService;
    }
    // Construct a future that will be run when the ArcsService is ready (in onServiceConnected).
    CompletableFuture<IArcsService> future = new CompletableFuture<>();
    waitingFutures.add(future);

    // Start up the ArcsService.
    arcsServiceStarter.start(this);

    // Block until the future completes.
    try {
      return future.get();
    } catch (InterruptedException | ExecutionException e) {
      throw new RuntimeException(e);
    }
  }

  public CompletableFuture<IArcsService> connectToArcsService() {
    if (arcsService != null) {
      return CompletableFuture.completedFuture(arcsService);
    }
    return CompletableFuture.supplyAsync(this::connectToArcsServiceSync);
  }

  @Override
  public void sendMessageToArcs(String message, DataListener listener) {
    if (listener != null) {
      // TODO: Add support for listeners.
      throw new UnsupportedOperationException(
          "listeners are not yet supported by the ArcsServiceBridge.");
    }

    connectToArcsService().thenAccept(service -> {
      try {
        service.sendMessageToArcs(message);
      } catch (RemoteException e) {
        throw new RuntimeException(e);
      }
    });
  }

  @Override
  public void onServiceConnected(ComponentName name, IBinder binder) {
    arcsService = IArcsService.Stub.asInterface(binder);
    for (CompletableFuture<IArcsService> future : waitingFutures) {
      future.complete(arcsService);
    }
    waitingFutures.clear();
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
