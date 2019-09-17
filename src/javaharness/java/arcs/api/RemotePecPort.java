package arcs.api;

import javax.inject.Inject;

/**
 * A proxy PEC port implementation. It receives PEC messages and forwards them to a real
 * PECInnerPort implementation that lives elsewhere (e.g. in another Android service).
 */
public class RemotePecPort implements PecMessageReceiver {

  @Inject
  RemotePecPort() {}

  @Override
  public void onReceivePecMessage(PortableJson message) {
    // TODO(csilvestrini): Forward message through the IArcsService back to the actual remote PEC.
  }
}
