package arcs.android.api;

import arcs.android.api.IRemotePecCallback;

/**
  * This interface allows apps to communicate with ArcsService.
  */
interface IArcsService {
  // TODO: Define a nicer service API that more clearly reflects particle lifecycles,
  // e.g. attachPec, unattachPec, etc.
  void sendMessageToArcs(String message);

  void registerRemotePec(String pecId, IRemotePecCallback callback);

  void deregisterRemotePec(String pecId);
}

