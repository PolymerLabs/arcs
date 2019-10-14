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
import arcs.api.Arcs;
import arcs.api.PecPort;
import arcs.api.PecPortManager;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.ShellApi;
import arcs.api.UiRenderer;

// This class implements Arcs API for callers accessing Arcs via Android service.
public class ArcsAndroid implements Arcs {

  private final Context context;
  private final PecPortManager pecPortManager;
  private final PortableJsonParser jsonParser;
  private final ShellApi shellApi;
  private final ServiceConnection serviceConnection;

  private IArcsService arcsService;
  private Queue<Consumer<IArcsService>> pendingCalls = new ArrayDeque<>();

  @Inject
  ArcsAndroid(
      Context context,
      PecPortManager pecPortManager,
      PortableJsonParser jsonParser,
      ShellApi shellApi) {
    this.context = context;
    this.pecPortManager = pecPortManager;
    this.jsonParser = jsonParser;
    this.shellApi = shellApi;
    this.serviceConnection = new HelperServiceConnection();

    this.shellApi.attachProxy(this::sendMessageToArcs);
  }

  @Override
  public void runArc(ArcData arcData) {
    PecPort pecPort =
        pecPortManager.getOrCreatePecPort(arcData.getPecId(), arcData.getSessionId());
    arcData.getParticleList().forEach(particleData -> {
      if (particleData.getParticle() != null) {
        pecPort.mapParticle(particleData.getParticle());
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
              pecPort.onReceivePecMessage(jsonParser.parse(message));
            }
          });
      } catch (RemoteException e) {
        e.printStackTrace();
      }
    });
  }

  @Override
  public void stopArc(ArcData arcData) {
    executeArcsServiceCall(iArcsService -> {
      try {
        iArcsService.stopArc(arcData.getArcId(), arcData.getPecId());
      } catch (RemoteException e) {
        e.printStackTrace();
      }
    });
  }

  @Override
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

  /**
   * If the service is not connected, adds the Consumer callback to a queue to be executed later
   * when the service (re)connects. Otherwise, invokes the provided callback immediately with an
   * instance of IArcsService.
   */
  private void executeArcsServiceCall(Consumer<IArcsService> code) {
    if (arcsService != null) {
      Log.d("Arcs", "Executing ArcsService call.");
      code.accept(arcsService);
    } else {
      Log.d("Arcs", "Enqueuing ArcsService call");
      pendingCalls.offer(code);
      Intent intent = new Intent(context, ArcsService.class);
      context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }
  }

  class HelperServiceConnection implements ServiceConnection {

    @Override
    public void onServiceConnected(ComponentName className, IBinder service) {
      Log.d("Arcs", "ArcsService.onServiceConnected");

      arcsService = IArcsService.Stub.asInterface(service);
      for (Consumer<IArcsService> call = pendingCalls.poll();
           call != null; call = pendingCalls.poll()) {
        call.accept(arcsService);
      }
    }

    @Override
    public void onServiceDisconnected(ComponentName className) {
      Log.d("Arcs", "ArcsService.onServiceDisconnected");
      arcsService = null;
    }
  }
}
