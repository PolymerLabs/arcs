package arcs.android;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;

import javax.inject.Inject;

import arcs.api.ArcData;

public class ArcsServiceBridge {

  private final Context context;
  private final Executor executor;
  private IArcsService arcsService; // Access via connectToArcsService.
  private List<CompletableFuture<IArcsService>> waitingFutures = new ArrayList<>();

  /**
   * Callback to run when the service is connected. This is a workaround so that we can deal with
   * checked exceptions ({@link RemoteException}) in lambdas.
   */
  @FunctionalInterface
  private interface ServiceCallback {
    void call(IArcsService service) throws RemoteException;
  }

  @Inject
  ArcsServiceBridge(Context context, Executor executor) {
    this.context = context;
    this.executor = executor;
  }

  public void startArc(ArcData arcData, IRemotePecCallback callback) {
    runServiceMethod(service -> {
      List<String> particleIds = new ArrayList<>();
      List<String> particleNames = new ArrayList<>();
      List<String> providedSlots = new ArrayList<>();
      arcData.getParticleList().forEach(particleData -> {
        particleIds.add(particleData.getId());
        particleNames.add(particleData.getName());
        providedSlots.add(particleData.getProvidedSlotId());
      });

      service.startArc(
          arcData.getArcId(),
          arcData.getPecId(),
          arcData.getRecipe(),
          particleIds,
          particleNames,
          providedSlots,
          callback);
    });
  }

  public void stopArc(String arcId, String pecId) {
    runServiceMethod(service -> service.stopArc(arcId, pecId));
  }

  public void registerRenderer(String modality, IRemoteOutputCallback callback) {
    runServiceMethod(service -> service.registerRenderer(modality, callback));
  }

  public void sendMessageToArcs(String message) {
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
    Intent intent = new Intent(context, ArcsService.class);
    context.bindService(intent, new ServiceConnection() {
      @Override
      public void onServiceConnected(ComponentName name, IBinder service) {
        arcsService = IArcsService.Stub.asInterface(service);
        for (CompletableFuture<IArcsService> future : waitingFutures) {
          future.complete(arcsService);
        }
        waitingFutures.clear();
      }

      @Override
      public void onServiceDisconnected(ComponentName name) {
        arcsService = null;
      }
    }, Context.BIND_AUTO_CREATE);

    // Block until the future completes.
    try {
      return future.get();
    } catch (InterruptedException | ExecutionException e) {
      throw new RuntimeException(e);
    }
  }
}
