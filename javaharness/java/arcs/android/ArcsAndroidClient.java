package arcs.android;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;
import java.util.function.Consumer;

import javax.inject.Inject;

import arcs.api.ArcData;
import arcs.api.ArcsMessageSender;
import arcs.api.Particle;
import arcs.api.PecInnerPort;
import arcs.api.PecPortManager;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.UiRenderer;

// This class implements Arcs API for clients to access Arcs via Android service.
public class ArcsAndroidClient {

  private static final String TAG = "Arcs";

  private final PecPortManager pecPortManager;
  private final PortableJsonParser jsonParser;
  private final ServiceConnection serviceConnection;

  private IArcsService arcsService;
  private Queue<Consumer<IArcsService>> pendingCalls = new ArrayDeque<>();

  @Inject
  ArcsAndroidClient(
      PecPortManager pecPortManager,
      PortableJsonParser jsonParser,
      ArcsMessageSender arcsMessageSender) {
    this.pecPortManager = pecPortManager;
    this.jsonParser = jsonParser;
    this.serviceConnection = new HelperServiceConnection();

    arcsMessageSender.attachProxy(this::sendMessageToArcs);
  }

  public void connect(Context context) {
    Intent intent = new Intent(context, ArcsService.class);
    context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
  }

  public void disconnect(Context context) {
    context.unbindService(serviceConnection);

    pendingCalls.clear();
  }

  public ArcData runArc(String recipe) {
    ArcData arcData = new ArcData.Builder().setRecipe(recipe).build();
    runArc(arcData);
    return arcData;
  }

  public ArcData runArc(String recipe, Particle particle) {
    ArcData arcData =
      new ArcData.Builder()
        .setRecipe(recipe)
        .addParticleData(new ArcData.ParticleData().setParticle(particle))
        .build();
    runArc(arcData);
    return arcData;
  }

  public ArcData runArc(String recipe, List<? extends Particle> particles) {
    ArcData.Builder builder = new ArcData.Builder().setRecipe(recipe);
    particles.forEach(particle -> builder.addParticleData(
      new ArcData.ParticleData().setParticle(particle)
    ));
    ArcData arcData = builder.build();
    runArc(arcData);
    return arcData;
  }

  public ArcData runArc(String recipe, String arcId, String pecId, Particle particle) {
    ArcData arcData =
      new ArcData.Builder()
        .setRecipe(recipe)
        .setArcId(arcId)
        .setPecId(pecId)
        .addParticleData(new ArcData.ParticleData().setParticle(particle))
        .build();
    runArc(arcData);
    return arcData;
  }

  public ArcData runArc(String recipe, String arcId, String pecId,
                        List<? extends Particle> particles) {
    ArcData.Builder builder =
      new ArcData.Builder()
        .setRecipe(recipe)
        .setArcId(arcId)
        .setPecId(pecId);
    particles.forEach(particle -> builder.addParticleData(
      new ArcData.ParticleData().setParticle(particle)
    ));
    ArcData arcData = builder.build();
    runArc(arcData);
    return arcData;
  }

  public void runArc(ArcData arcData) {
    PecInnerPort pecInnerPort =
        pecPortManager.getOrCreatePecInnerPort(arcData.getPecId(), arcData.getSessionId());
    arcData.getParticleList().forEach(particleData -> {
      if (particleData.getParticle() != null) {
        pecInnerPort.mapParticle(particleData.getParticle());
      }
    });

    executeArcsServiceCall(iArcsService -> {
      List<String> particleIds = new ArrayList<>();
      List<String> particleNames = new ArrayList<>();
      List<String> providedSlots = new ArrayList<>();
      arcData.getParticleList().forEach(particleData -> {
        particleIds.add(particleData.getId());
        particleNames.add(particleData.getName());
        providedSlots.add(particleData.getProvidedSlotId());
      });

      try {
        iArcsService.startArc(
          arcData.getArcId(),
          arcData.getPecId(),
          arcData.getRecipe(),
          particleIds,
          particleNames,
          providedSlots,
          new IRemotePecCallback.Stub() {
            @Override
            public void onMessage(String message) {
              pecInnerPort.onReceivePecMessage(jsonParser.parse(message));
            }
          });
      } catch (RemoteException e) {
        e.printStackTrace();
      }
    });
  }

  public void stopArc(ArcData arcData) {
    executeArcsServiceCall(iArcsService -> {
      try {
        iArcsService.stopArc(arcData.getArcId(), arcData.getPecId());
      } catch (RemoteException e) {
        e.printStackTrace();
      }
    });
  }

  public void registerRenderer(String modality, UiRenderer renderer) {
    executeArcsServiceCall(iArcsService -> {
      try {
        iArcsService.registerRenderer(modality,
          new IRemoteOutputCallback.Stub() {
            @Override
            public void onOutput(String output) {
              PortableJson json = jsonParser.parse(output);
              renderer.render(json);
            }
          });
      } catch (RemoteException e) {
        e.printStackTrace();
      }
    });
  }

  public void sendMessageToArcs(String message) {
    executeArcsServiceCall(iArcsService -> {
      try {
        iArcsService.sendMessageToArcs(message);
      } catch (RemoteException e) {
        e.printStackTrace();
      }
    });
  }

  public void addManifests(List<String> manifests, Consumer<Boolean> callback) {
    executeArcsServiceCall(iArcsService -> {
      try {
        boolean success = iArcsService.addManifests(manifests);
        callback.accept(success);
      } catch (RemoteException e) {
        e.printStackTrace();
      }
    });
  }

  /**
   * If the service is not connected, adds the Consumer callback to a queue to be executed later
   * when the service (re)connects. Otherwise, invokes the provided callback immediately with an
   * instance of IArcsService.
   */
  private void executeArcsServiceCall(Consumer<IArcsService> code) {
    if (arcsService != null) {
      Log.d(TAG, "Executing ArcsService call.");
      code.accept(arcsService);
    } else {
      Log.d(TAG, "Enqueuing ArcsService call");
      pendingCalls.offer(code);
    }
  }

  private class HelperServiceConnection implements ServiceConnection {
    @Override
    public void onServiceConnected(ComponentName className, IBinder service) {
      Log.d(TAG, "ArcsService.onServiceConnected");

      arcsService = IArcsService.Stub.asInterface(service);
      for (Consumer<IArcsService> call = pendingCalls.poll();
           call != null; call = pendingCalls.poll()) {
        call.accept(arcsService);
      }
    }

    @Override
    public void onServiceDisconnected(ComponentName className) {
      Log.d(TAG, "ArcsService.onServiceDisconnected");
      arcsService = null;
    }
  }
}
