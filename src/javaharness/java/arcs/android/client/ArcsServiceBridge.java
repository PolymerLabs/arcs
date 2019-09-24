package arcs.android.client;

import android.content.ComponentName;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import arcs.android.api.IArcsService;
import arcs.android.api.IRemoteOutputCallback;
import arcs.android.api.IRemotePecCallback;
import arcs.api.ArcsEnvironment;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import javax.inject.Inject;

class ArcsServiceBridge implements ArcsEnvironment, ServiceConnection {

  private final ArcsServiceStarter arcsServiceStarter;
  private IArcsService arcsService; // Access via connectToArcsService.
  private List<CompletableFuture<IArcsService>> waitingFutures = new ArrayList<>();
  private Executor executor = Executors.newCachedThreadPool();

  /**
   * Callback to run when the service is connected. This is a workaround so that we can deal with
   * checked exceptions ({@link RemoteException}) in lambdas.
   */
  @FunctionalInterface
  private interface ServiceCallback {
    void call(IArcsService service) throws RemoteException;
  }

  @Inject
  ArcsServiceBridge(ArcsServiceStarter arcsServiceStarter) {
    this.arcsServiceStarter = arcsServiceStarter;
  }

  void startArc(
      String arcId,
      String pecId,
      String recipe,
      String particleId,
      String particleName,
      String providedSlotId,
      IRemotePecCallback callback) {
    runServiceMethod(
        service -> service.startArc(arcId, pecId, recipe, particleId, particleName, providedSlotId, callback));
  }

  void stopArc(String arcId, String pecId) {
    runServiceMethod(service -> service.stopArc(arcId, pecId));
  }

  void registerRenderer(String modality, IRemoteOutputCallback callback) {
    runServiceMethod(service -> service.registerRenderer(modality, callback));
  }

  @Override
  public void sendMessageToArcs(String message, DataListener listener) {
    if (listener != null) {
      // TODO: Add support for listeners.
      throw new UnsupportedOperationException(
          "listeners are not yet supported by the ArcsServiceBridge.");
    }

    runServiceMethod(service -> service.sendMessageToArcs(message));
  }

  /**
   * Connects to the Arcs service (if not already connected), and then runs the given service
   * method.
   */
  private void runServiceMethod(ServiceCallback callback) {
    executor.execute(
        () -> {
          IArcsService service = connectToArcsServiceSync();
          try {
            callback.call(service);
          } catch (RemoteException e) {
            throw new RuntimeException(e);
          }
        });
  }

  private IArcsService connectToArcsServiceSync() {
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

  private CompletableFuture<IArcsService> connectToArcsService() {
    if (arcsService != null) {
      return CompletableFuture.completedFuture(arcsService);
    }
    return CompletableFuture.supplyAsync(this::connectToArcsServiceSync, executor);
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
}
