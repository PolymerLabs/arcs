package arcs.android;

import arcs.android.IRemoteOutputCallback;
import arcs.android.IRemotePecCallback;

import java.util.List;

/**
  * This interface allows apps to communicate with ArcsService.
  */
interface IArcsService {
  // TODO: Define a nicer service API that more clearly reflects particle lifecycles,
  // e.g. attachPec, unattachPec, etc.
  void sendMessageToArcs(String message);

  void startArc(
      String arcId,
      String pecId,
      String recipe,
      // TODO: use Parcelable for ParticleData (and/or the entire ArcData).
      in List<String> particleIds,
      in List<String> particleNames,
      in List<String> providedSlotIds,
      IRemotePecCallback callback);

  void stopArc(String arcId, String pecId);

  // TODO: add unregisterRenderer method.
  void registerRenderer(String modality, IRemoteOutputCallback callback);

  // Adds manifests to Arcs.
  // Returns true if manifests are successfully added. Otherwise false.
  boolean addManifests(in List<String> manifests);
}

