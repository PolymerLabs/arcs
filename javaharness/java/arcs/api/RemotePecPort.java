package arcs.api;

import java.util.function.Consumer;

/**
 * A proxy PEC port implementation. It receives PEC messages and forwards them to a real
 * PecInnerPort implementation that lives elsewhere (e.g. in another Android service).
 */
public class RemotePecPort implements PecMessageReceiver {

  private final Consumer<String> callback;
  private final PortableJsonParser jsonParser;

  public RemotePecPort(Consumer<String> callback, PortableJsonParser jsonParser) {
    this.callback = callback;
    this.jsonParser = jsonParser;
  }

  @Override
  public void onReceivePecMessage(PortableJson message) {
    callback.accept(jsonParser.stringify(message));
  }
}
