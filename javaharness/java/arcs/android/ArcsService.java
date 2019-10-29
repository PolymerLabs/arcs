package arcs.android;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

import java.util.List;

import javax.inject.Inject;

import arcs.api.ArcData;

/**
 * ArcsService wraps Arcs runtime. Other Android activities/services are expected to connect to
 * ArcsService to communicate with Arcs.
 */
public class ArcsService extends Service {

  private static final String TAG = "Arcs";

  @Inject
  ArcsShellApi arcsShellApi;

  @Override
  public void onCreate() {
    super.onCreate();
    Log.d(TAG, "onCreate()");
    DaggerArcsServiceComponent.builder().build().inject(this);
    arcsShellApi.init(this);
  }

  @Override
  public void onDestroy() {
    Log.d(TAG, "onDestroy()");
    arcsShellApi.destroy();
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent intent) {
    Log.d(TAG, "onBind()");
    return new IArcsService.Stub() {
      @Override
      public void sendMessageToArcs(String message) {
        arcsShellApi.sendMessageToArcs(message);
      }

      @Override
      public void startArc(
          String arcId,
          String pecId,
          String recipe,
          List<String> particleIds,
          List<String> particleNames,
          List<String> providedSlotIds,
          IRemotePecCallback callback) {
        ArcData.Builder arcDataBuilder = new ArcData.Builder()
            .setArcId(arcId)
            .setPecId(pecId)
            .setRecipe(recipe);
        for (int i = 0; i < particleIds.size(); ++i) {
          arcDataBuilder.addParticleData(
              new ArcData.ParticleData()
                  .setId(particleIds.get(i))
                  .setName(particleNames.get(i))
                  .setProvidedSlotId(providedSlotIds.get(i)));
        }

        ArcData arcData = arcDataBuilder.build();
        arcsShellApi.startArc(arcData, callback);
      }

      @Override
      public void stopArc(String arcId, String pecId) {
        arcsShellApi.stopArc(
            new ArcData.Builder().setArcId(arcId).setPecId(pecId).build());
      }

      @Override
      public void registerRenderer(String modality, IRemoteOutputCallback callback) {
        arcsShellApi.registerRemoteRenderer(modality, callback);
      }

      @Override
      public boolean addManifests(List<String> manifests) {
        return arcsShellApi.addManifests(manifests);
      }
    };
  }
}
