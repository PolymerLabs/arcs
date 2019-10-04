package arcs.android.api;

import arcs.android.api.IRemotePecCallback;
import arcs.android.api.IRemoteOutputCallback;

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
      String particleId,
      String particleName,
      String providedSlotId,
      IRemotePecCallback callback);

  void stopArc(String arcId, String pecId);

  void registerRenderer(String modality, IRemoteOutputCallback callback);
  // TODO: add unregisterRenderer method.
  // TODO: add UI events passing / handling method.
}

