package arcs.api;

import java.util.function.Consumer;

/**
 * A proxy PEC port implementation. It receives PEC messages and forwards them to a real
 * {@code PECInnerPort} implementation that lives elsewhere (e.g. in another Android service).
 */
public class PecInnerPortProxy {

  private final Consumer<String> callback;
  private final PortableJsonParser jsonParser;

  public PecInnerPortProxy(Consumer<String> callback, PortableJsonParser jsonParser) {
    this.callback = callback;
    this.jsonParser = jsonParser;
  }

  public void onReceivePecMessage(PortableJson message) {
    callback.accept(jsonParser.stringify(message));
  }
}
