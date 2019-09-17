package arcs.api;

import android.os.RemoteException;
import arcs.android.api.IRemotePecCallback;

/**
 * A proxy PEC port implementation. It receives PEC messages and forwards them to a real
 * PECInnerPort implementation that lives elsewhere (e.g. in another Android service).
 */
public class RemotePecPort implements PecMessageReceiver {

  private final IRemotePecCallback callback;
  private final PortableJsonParser jsonParser;

  public RemotePecPort(IRemotePecCallback callback, PortableJsonParser jsonParser) {
    this.callback = callback;
    this.jsonParser = jsonParser;
  }

  @Override
  public void onReceivePecMessage(PortableJson message) {
    try {
      callback.onMessage(jsonParser.stringify(message));
    } catch (RemoteException e) {
      throw new RuntimeException(e);
    }
  }
}
