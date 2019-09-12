package arcs.android.api;

/**
  * This interface allows apps to communicate with ArcsService.
  */
interface IArcsService {
  void sendMessageToArcs(String message);
}
